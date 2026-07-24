import { createHash } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

export interface ExtractedCar {
  files: Map<string, Uint8Array>
  blocks: number
}

interface Block {
  cid: Uint8Array
  codec: number
  bytes: Uint8Array
}

function readVarint(bytes: Uint8Array, start: number): [number, number] {
  let value = 0
  let shift = 0
  for (let offset = start; offset < bytes.length && shift < 53; offset += 1) {
    const byte = bytes[offset]!
    value += (byte & 0x7f) * 2 ** shift
    if ((byte & 0x80) === 0) return [value, offset + 1]
    shift += 7
  }
  throw new Error("Invalid or truncated varint")
}

function decodeBase58(value: string): Uint8Array {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
  let number = 0n
  for (const char of value) {
    const digit = alphabet.indexOf(char)
    if (digit < 0) throw new Error(`Invalid base58 character: ${char}`)
    number = number * 58n + BigInt(digit)
  }
  const output: number[] = []
  while (number > 0n) {
    output.unshift(Number(number & 0xffn))
    number >>= 8n
  }
  for (const char of value) {
    if (char !== "1") break
    output.unshift(0)
  }
  return Uint8Array.from(output)
}

function decodeBase32(value: string): Uint8Array {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567"
  let bits = 0
  let accumulator = 0
  const output: number[] = []
  for (const char of value.toLowerCase()) {
    const digit = alphabet.indexOf(char)
    if (digit < 0) throw new Error(`Invalid base32 character: ${char}`)
    accumulator = (accumulator << 5) | digit
    bits += 5
    if (bits >= 8) {
      bits -= 8
      output.push((accumulator >> bits) & 0xff)
    }
  }
  return Uint8Array.from(output)
}

function cidBytes(cid: string): Uint8Array {
  if (cid.startsWith("Qm")) return decodeBase58(cid)
  if (cid.startsWith("b")) return decodeBase32(cid.slice(1))
  throw new Error(`Unsupported CID encoding: ${cid.slice(0, 8)}`)
}

function cidLengthAndCodec(bytes: Uint8Array): [number, number] {
  if (bytes[0] === 0x12 && bytes[1] === 0x20) return [34, 0x70]
  const [version, afterVersion] = readVarint(bytes, 0)
  if (version !== 1) throw new Error(`Unsupported CID version: ${version}`)
  const [codec, afterCodec] = readVarint(bytes, afterVersion)
  const [, afterHashCode] = readVarint(bytes, afterCodec)
  const [digestLength, afterDigestLength] = readVarint(bytes, afterHashCode)
  return [afterDigestLength + digestLength, codec]
}

function key(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex")
}

function verifyBlock(block: Block): void {
  const [versionOffset, codec] =
    block.cid[0] === 0x12
      ? [0, 0x70]
      : (() => {
          const [, afterVersion] = readVarint(block.cid, 0)
          const [parsedCodec, afterCodec] = readVarint(block.cid, afterVersion)
          return [afterCodec, parsedCodec] as const
        })()
  void codec
  const [hashCode, afterHashCode] = readVarint(block.cid, versionOffset)
  const [digestLength, afterDigestLength] = readVarint(block.cid, afterHashCode)
  if (hashCode !== 0x12 || digestLength !== 32) {
    throw new Error(`Unsupported CAR multihash: 0x${hashCode.toString(16)}/${digestLength}`)
  }
  const expected = block.cid.subarray(afterDigestLength, afterDigestLength + digestLength)
  const actual = createHash("sha256").update(block.bytes).digest()
  if (!actual.equals(expected)) throw new Error(`CAR block hash mismatch: ${key(block.cid)}`)
}

function parseCar(bytes: Uint8Array): Map<string, Block> {
  let offset = 0
  const [headerLength, afterHeaderLength] = readVarint(bytes, offset)
  offset = afterHeaderLength + headerLength
  if (offset > bytes.length) throw new Error("Truncated CAR header")
  const blocks = new Map<string, Block>()
  while (offset < bytes.length) {
    const [frameLength, afterFrameLength] = readVarint(bytes, offset)
    offset = afterFrameLength
    const frameEnd = offset + frameLength
    if (frameEnd > bytes.length) throw new Error("Truncated CAR block")
    const frame = bytes.subarray(offset, frameEnd)
    const [length, codec] = cidLengthAndCodec(frame)
    const block: Block = { cid: frame.subarray(0, length), codec, bytes: frame.subarray(length) }
    verifyBlock(block)
    blocks.set(key(block.cid), block)
    offset = frameEnd
  }
  return blocks
}

interface PbLink {
  hash: Uint8Array
  name: string
}

function fields(bytes: Uint8Array): { number: number; wire: number; value: Uint8Array | number }[] {
  const output: { number: number; wire: number; value: Uint8Array | number }[] = []
  let offset = 0
  while (offset < bytes.length) {
    const [tag, afterTag] = readVarint(bytes, offset)
    offset = afterTag
    const wire = tag & 7
    if (wire === 0) {
      const [value, after] = readVarint(bytes, offset)
      output.push({ number: tag >> 3, wire, value })
      offset = after
    } else if (wire === 2) {
      const [length, afterLength] = readVarint(bytes, offset)
      const end = afterLength + length
      if (end > bytes.length) throw new Error("Truncated protobuf field")
      output.push({ number: tag >> 3, wire, value: bytes.subarray(afterLength, end) })
      offset = end
    } else if (wire === 1) offset += 8
    else if (wire === 5) offset += 4
    else throw new Error(`Unsupported protobuf wire type: ${wire}`)
  }
  return output
}

function parsePbNode(bytes: Uint8Array): { data: Uint8Array; links: PbLink[] } {
  let data = new Uint8Array()
  const links: PbLink[] = []
  for (const field of fields(bytes)) {
    if (field.number === 1 && field.value instanceof Uint8Array) data = new Uint8Array(field.value)
    if (field.number === 2 && field.value instanceof Uint8Array) {
      let hash = new Uint8Array()
      let name = ""
      for (const linkField of fields(field.value)) {
        if (linkField.number === 1 && linkField.value instanceof Uint8Array)
          hash = new Uint8Array(linkField.value)
        if (linkField.number === 2 && linkField.value instanceof Uint8Array)
          name = new TextDecoder().decode(linkField.value)
      }
      links.push({ hash, name })
    }
  }
  return { data, links }
}

function unixFsData(bytes: Uint8Array): { type: number; data: Uint8Array } {
  let type = -1
  let data = new Uint8Array()
  for (const field of fields(bytes)) {
    if (field.number === 1 && typeof field.value === "number") type = field.value
    if (field.number === 2 && field.value instanceof Uint8Array) data = new Uint8Array(field.value)
  }
  return { type, data }
}

function safePath(path: string): string {
  const normalized = path.replaceAll("\\", "/").replace(/^\/+/, "")
  if (!normalized || normalized.split("/").some(part => part === "..")) {
    throw new Error(`Unsafe archive path: ${path}`)
  }
  return normalized
}

export function extractCar(car: Uint8Array, rootCid: string): ExtractedCar {
  const blocks = parseCar(car)
  const files = new Map<string, Uint8Array>()
  const visit = (cid: Uint8Array, path: string): Uint8Array => {
    const block = blocks.get(key(cid))
    if (!block) throw new Error(`CAR is missing linked block ${key(cid)}`)
    if (block.codec === 0x55) {
      if (path) files.set(safePath(path), block.bytes)
      return block.bytes
    }
    if (block.codec !== 0x70)
      throw new Error(`Unsupported IPLD codec: 0x${block.codec.toString(16)}`)
    const node = parsePbNode(block.bytes)
    const unix = unixFsData(node.data)
    if (unix.type === 1) {
      for (const link of node.links) {
        const childPath = path ? `${path}/${link.name}` : link.name
        visit(link.hash, childPath)
      }
      return new Uint8Array()
    }
    if (unix.type === 5) throw new Error("UnixFS HAMT directories are not supported yet")
    if (unix.type !== 0 && unix.type !== 2)
      throw new Error(`Unsupported UnixFS node type: ${unix.type}`)
    const chunks = [unix.data, ...node.links.map(link => visit(link.hash, ""))]
    const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const output = new Uint8Array(length)
    let cursor = 0
    for (const chunk of chunks) {
      output.set(chunk, cursor)
      cursor += chunk.length
    }
    if (path) files.set(safePath(path), output)
    return output
  }
  const root = visit(cidBytes(rootCid), "")
  if (root.length > 0) files.set("index.html", root)
  return { files, blocks: blocks.size }
}

export async function writeExtractedCar(result: ExtractedCar, output: string): Promise<void> {
  for (const [path, content] of result.files) {
    const destination = join(output, safePath(path))
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, content)
  }
}
