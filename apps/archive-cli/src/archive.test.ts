import { createHash } from "node:crypto"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { WhitehashToken } from "@whitehash/chain-reader"
import { afterEach, describe, expect, it, vi } from "vitest"

const clientMocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  fetchUri: vi.fn(),
}))

vi.mock("@whitehash/chain-reader", () => ({
  createWhitehashClient: () => clientMocks,
}))

import { archiveToken, verifyArchive } from "./archive.js"

const temporaryDirectories: string[] = []

afterEach(async () => {
  clientMocks.getToken.mockReset()
  clientMocks.fetchUri.mockReset()
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map(directory => rm(directory, { recursive: true, force: true })),
  )
})

function base32(bytes: Uint8Array): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567"
  let bits = 0
  let accumulator = 0
  let output = "b"
  for (const byte of bytes) {
    accumulator = (accumulator << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      output += alphabet[(accumulator >> bits) & 31]
    }
  }
  if (bits > 0) output += alphabet[(accumulator << (5 - bits)) & 31]
  return output
}

function rawCar(content: Uint8Array): { car: Uint8Array; cid: string } {
  const digest = createHash("sha256").update(content).digest()
  const cidBytes = Uint8Array.from([1, 0x55, 0x12, 0x20, ...digest])
  const frameLength = cidBytes.length + content.length
  return {
    car: Uint8Array.from([1, 0, frameLength, ...cidBytes, ...content]),
    cid: base32(cidBytes),
  }
}

describe("single-token archives", () => {
  it("writes and verifies the complete shared archive layout", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "whitehash-token-test-"))
    temporaryDirectories.push(temporaryRoot)
    const outDir = join(temporaryRoot, "archive")
    const fixture = rawCar(new TextEncoder().encode("<!doctype html><h1>offline</h1>"))
    const token: WhitehashToken = {
      chain: "tezos:mainnet",
      contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
      tokenId: "16333",
      name: "Offline Example #16333",
      description: null,
      iterationHash: "ooOffline",
      artifactUri: `ipfs://${fixture.cid}/index.html?fxhash=ooOffline#viewer`,
      displayUri: null,
      thumbnailUri: null,
      generatorUri: `ipfs://${fixture.cid}/index.html`,
      attributes: [],
      assigned: true,
      metadataUri: "ipfs://metadata",
      raw: { name: "Offline Example #16333", editions: 1n },
    }
    clientMocks.getToken.mockResolvedValue(token)
    clientMocks.fetchUri.mockRejectedValue(new Error("Unexpected image fetch"))
    const fetcher = vi.fn().mockResolvedValue(
      new Response(Uint8Array.from(fixture.car).buffer, {
        status: 200,
        headers: { "content-type": "application/vnd.ipld.car" },
      }),
    )

    const manifest = await archiveToken({
      chain: token.chain,
      contract: token.contract,
      tokenId: token.tokenId,
      outDir,
      gateways: ["https://gateway.invalid"],
      fetch: fetcher,
    })

    expect(clientMocks.getToken).toHaveBeenCalledWith({
      chain: token.chain,
      contract: token.contract,
      tokenId: token.tokenId,
    })
    expect(manifest.format).toBe(1)
    expect(manifest.addresses).toEqual([])
    expect(manifest.tokens).toHaveLength(1)

    const tokenDir = join(outDir, "tezos:mainnet", token.contract, token.tokenId)
    await expect(readFile(join(outDir, "index.html"), "utf8")).resolves.toContain(
      "whitehash archive",
    )
    await expect(readFile(join(outDir, "manifest.json"), "utf8")).resolves.toContain(
      '"addresses": []',
    )
    await expect(readFile(join(tokenDir, "metadata.json"), "utf8")).resolves.toContain(
      '"editions": "1"',
    )
    const wrapper = await readFile(join(tokenDir, "index.html"), "utf8")
    expect(wrapper).toContain("./artifact/index.html?fxhash=ooOffline#viewer")
    await expect(readFile(join(tokenDir, "artifact", "index.html"), "utf8")).resolves.toContain(
      "offline",
    )
    await expect(readFile(join(tokenDir, "integrity.json"), "utf8")).resolves.toContain(
      "artifact/index.html",
    )
    await expect(verifyArchive(outDir)).resolves.toMatchObject({ tokens: 1 })

    await writeFile(join(tokenDir, "metadata.json"), '{"tampered":true}\n')
    await expect(verifyArchive(outDir)).rejects.toThrow("Integrity mismatch")
  })
})
