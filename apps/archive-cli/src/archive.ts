import { createHash } from "node:crypto"
import { gunzipSync } from "node:zlib"
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises"
import { dirname, extname, join, relative, resolve, sep } from "node:path"
import onchfs from "onchfs"
import { createWhitehashClient, type ChainId, type WhitehashToken } from "@whitehash/chain-reader"
import { ARTWORK_IFRAME_SANDBOX, chainSlug, type OnchfsResponse } from "@whitehash/core"
import { ONCHFS_WORKER_NETWORKS } from "@whitehash/onchfs-sw"
import { DEFAULT_IPFS_GATEWAYS } from "@whitehash/resolve"
import { extractCar, writeExtractedCar } from "./car.js"

export interface ArchiveOptions {
  addresses: string[]
  chains?: ChainId[]
  outDir: string
  limit?: number
  gateways?: string[]
  fetch?: typeof globalThis.fetch
  onProgress?: (message: string) => void
}

export interface ArchiveTokenOptions {
  chain: ChainId
  contract: string
  tokenId: string
  outDir: string
  gateways?: string[]
  fetch?: typeof globalThis.fetch
  onProgress?: (message: string) => void
}

export interface ArchivedToken {
  chain: ChainId
  contract: string
  tokenId: string
  name: string | null
  path: string
  artifact: "ipfs" | "onchfs"
  files: number
}

export interface ArchiveManifest {
  format: 1
  createdAt: string
  addresses: string[]
  tokens: ArchivedToken[]
}

function safeSegment(value: string): string {
  const output = value.replace(/[^a-zA-Z0-9._:-]/g, "_")
  if (!output || output === "." || output === "..") throw new Error(`Unsafe path segment: ${value}`)
  return output
}

function html(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function stringify(value: unknown): string {
  return (
    JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? item.toString() : item), 2) +
    "\n"
  )
}

function contentParts(uri: string): {
  scheme: "ipfs" | "onchfs"
  cid: string
  path: string
  suffix: string
} {
  const match = /^(ipfs|onchfs):\/\/([^/?#]+)([^?#]*)?([?#].*)?$/i.exec(uri)
  if (!match) throw new Error(`Unsupported generator URI: ${uri}`)
  return {
    scheme: match[1]!.toLowerCase() as "ipfs" | "onchfs",
    cid: match[2]!,
    path: (match[3] ?? "").replace(/^\/+/, ""),
    suffix: match[4] ?? "",
  }
}

function renderSuffix(token: WhitehashToken): string {
  if (!token.artifactUri) return ""
  const query = token.artifactUri.indexOf("?")
  const fragment = token.artifactUri.indexOf("#")
  const start = query < 0 ? fragment : fragment < 0 ? query : Math.min(query, fragment)
  return start < 0 ? "" : token.artifactUri.slice(start)
}

async function fetchCar(
  cid: string,
  gateways: string[],
  fetcher: typeof globalThis.fetch,
): Promise<{ bytes: Uint8Array; gateway: string }> {
  const errors: string[] = []
  for (const gateway of gateways) {
    const url = `${gateway.replace(/\/+$/, "")}/ipfs/${cid}?format=car`
    try {
      const response = await fetcher(url, { headers: { accept: "application/vnd.ipld.car" } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const type = response.headers.get("content-type") ?? ""
      if (!/application\/(vnd\.ipld\.car|octet-stream)/i.test(type)) {
        throw new Error(`unexpected content-type ${type || "(missing)"}`)
      }
      return { bytes: new Uint8Array(await response.arrayBuffer()), gateway }
    } catch (cause) {
      errors.push(`${url}: ${cause instanceof Error ? cause.message : String(cause)}`)
    }
  }
  throw new Error(`No trustless gateway returned a CAR for ${cid}:\n${errors.join("\n")}`)
}

function referenceValues(content: Uint8Array, path: string): string[] {
  const text = new TextDecoder().decode(content)
  const matches: RegExpMatchArray[] = []
  if (/\.(?:html?|svg)$/i.test(path)) {
    matches.push(...text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi))
    matches.push(...text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi))
  }
  if (/\.css$/i.test(path)) matches.push(...text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi))
  if (/\.(?:js|mjs)$/i.test(path)) {
    matches.push(
      ...text.matchAll(/\b(?:import|export)\s+(?:[^"';()]*?\s+from\s*)?["']([^"']+)["']/g),
    )
    matches.push(...text.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g))
  }
  return matches.map(match => match[1]?.trim()).filter((value): value is string => Boolean(value))
}

function referencedPaths(content: Uint8Array, currentPath: string): string[] {
  const output = new Set<string>()
  for (const value of referenceValues(content, currentPath)) {
    if (/^(?:[a-z]+:|\/\/|#|data:|blob:)/i.test(value)) continue
    const withoutState = value.split(/[?#]/, 1)[0]!
    const base = currentPath.includes("/") ? dirname(currentPath) : ""
    const normalized = join(base, withoutState).split(sep).join("/").replace(/^\.\//, "")
    if (normalized && !normalized.startsWith("../")) output.add(normalized)
  }
  return [...output]
}

function onchfsResolver(chain: ChainId): (uri: string) => Promise<OnchfsResponse> {
  const network = ONCHFS_WORKER_NETWORKS.find(item => item.slug === chainSlug(chain))
  if (!network) throw new Error(`No onchfs resolver for ${chain}`)
  return onchfs.resolver.create([
    { blockchain: network.blockchain as never, rpcs: [...network.rpcs] },
  ]) as unknown as ReturnType<typeof onchfsResolver>
}

async function archiveOnchfs(
  token: WhitehashToken,
  cid: string,
  initialPath: string,
  artifactDir: string,
): Promise<number> {
  const read = onchfsResolver(token.chain)
  const queue = [initialPath || "index.html"]
  const visited = new Set<string>()
  while (queue.length > 0) {
    const path = queue.shift()!
    if (visited.has(path)) continue
    visited.add(path)
    const response = await read(`/${cid}/${path}`)
    if (response.status === 308 && response.headers.Location) {
      const location = response.headers.Location.replace(/^\/+/, "").replace(`${cid}/`, "")
      queue.push(location)
      continue
    }
    if (response.status !== 200) throw new Error(`onchfs ${cid}/${path}: HTTP ${response.status}`)
    let content = response.content
    if (String(response.headers["content-encoding"] ?? "").toLowerCase() === "gzip") {
      content = new Uint8Array(gunzipSync(content))
    }
    const destination = join(artifactDir, path)
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, content)
    for (const referenced of referencedPaths(content, path)) queue.push(referenced)
  }
  return visited.size
}

function extension(uri: string, contentType: string | null): string {
  const pathExtension = extname(uri.split(/[?#]/, 1)[0] ?? "")
  if (/^\.[a-zA-Z0-9]{1,8}$/.test(pathExtension)) return pathExtension
  const known: Record<string, string> = {
    "image/avif": ".avif",
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
  }
  return known[(contentType ?? "").split(";", 1)[0]!.toLowerCase()] ?? ".bin"
}

async function archiveImage(
  token: WhitehashToken,
  kind: "thumbnail" | "display",
  uri: string | null,
  tokenDir: string,
  fetchUri: (uri: string, options: { chain: ChainId }) => Promise<Response>,
): Promise<string | null> {
  if (!uri) return null
  const response = await fetchUri(uri, { chain: token.chain })
  if (!response.ok) throw new Error(`${kind} image: HTTP ${response.status}`)
  const filename = `${kind}${extension(uri, response.headers.get("content-type"))}`
  await writeFile(join(tokenDir, filename), new Uint8Array(await response.arrayBuffer()))
  return filename
}

async function fileHashes(root: string): Promise<Record<string, string>> {
  const output: Record<string, string> = {}
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (entry.isFile() && entry.name !== "integrity.json") {
        const local = relative(root, path).split(sep).join("/")
        output[local] = createHash("sha256")
          .update(await readFile(path))
          .digest("hex")
      }
    }
  }
  await visit(root)
  return Object.fromEntries(Object.entries(output).sort(([a], [b]) => a.localeCompare(b)))
}

function tokenWrapper(token: WhitehashToken, entry: string): string {
  const title = html(token.name ?? `${token.contract} #${token.tokenId}`)
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title>
<style>html,body,iframe{width:100%;height:100%;margin:0;border:0;background:#000}body{overflow:hidden}</style></head>
<body><iframe title="${title}" sandbox="${ARTWORK_IFRAME_SANDBOX}" src="./artifact/${html(entry)}${html(renderSuffix(token))}"></iframe></body></html>\n`
}

function gallery(manifest: ArchiveManifest): string {
  const cards = manifest.tokens
    .map(
      token =>
        `<li><a href="./${html(token.path)}/index.html">${html(token.name ?? `${token.contract} #${token.tokenId}`)}</a><small>${html(token.chain)} · ${html(token.artifact)}</small></li>`,
    )
    .join("\n")
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>whitehash archive</title><style>body{font:16px system-ui;background:#090909;color:#eee;max-width:70rem;margin:3rem auto;padding:0 1rem}ul{display:grid;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr));gap:1rem;padding:0}li{list-style:none;border:1px solid #333;padding:1rem}a{color:#fff}small{display:block;color:#999;margin-top:.5rem}</style></head><body><h1>whitehash archive</h1><p>${manifest.tokens.length} artwork${manifest.tokens.length === 1 ? "" : "s"}, preserved from public infrastructure.</p><ul>${cards}</ul></body></html>\n`
}

export async function verifyArchive(root: string): Promise<{ tokens: number; files: number }> {
  const manifest = JSON.parse(
    await readFile(join(root, "manifest.json"), "utf8"),
  ) as ArchiveManifest
  let files = 0
  await stat(join(root, "index.html"))
  for (const token of manifest.tokens) {
    const tokenDir = resolve(root, token.path)
    if (!tokenDir.startsWith(resolve(root) + sep))
      throw new Error(`Manifest path escapes archive: ${token.path}`)
    const wrapper = await readFile(join(tokenDir, "index.html"), "utf8")
    const source = /src="\.\/artifact\/([^"?#]+)(?:[?#][^"]*)?"/.exec(wrapper)?.[1]
    if (!source) throw new Error(`Wrapper has no local artifact reference: ${token.path}`)
    await stat(join(tokenDir, "artifact", source))
    const artifactDir = join(tokenDir, "artifact")
    const inspectReferences = async (directory: string): Promise<void> => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) {
          await inspectReferences(path)
          continue
        }
        if (!/\.(?:css|html?|js|mjs|svg)$/i.test(entry.name)) continue
        const content = new Uint8Array(await readFile(path))
        for (const value of referenceValues(content, entry.name)) {
          if (/^(?:data:|blob:|#|javascript:|mailto:)/i.test(value)) continue
          if (/^(?:[a-z]+:|\/\/)/i.test(value)) {
            throw new Error(
              `External artifact reference in ${relative(artifactDir, path)}: ${value}`,
            )
          }
          const local = value.split(/[?#]/, 1)[0]
          if (!local) continue
          const target = resolve(dirname(path), local)
          if (!target.startsWith(resolve(artifactDir) + sep)) {
            throw new Error(`Artifact reference escapes its folder: ${value}`)
          }
          await stat(target)
        }
      }
    }
    await inspectReferences(artifactDir)
    const expected = JSON.parse(await readFile(join(tokenDir, "integrity.json"), "utf8")) as Record<
      string,
      string
    >
    const actual = await fileHashes(tokenDir)
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error(`Integrity mismatch: ${token.path}`)
    files += Object.keys(actual).length
  }
  return { tokens: manifest.tokens.length, files }
}

interface WriteArchiveOptions {
  tokens: WhitehashToken[]
  addresses: string[]
  outDir: string
  gateways: string[]
  fetcher: typeof globalThis.fetch
  fetchUri: (uri: string, options: { chain: ChainId }) => Promise<Response>
  onProgress?: (message: string) => void
}

async function writeArchive(options: WriteArchiveOptions): Promise<ArchiveManifest> {
  const outDir = resolve(options.outDir)
  await mkdir(outDir, { recursive: true })
  const archived: ArchivedToken[] = []
  for (const [index, token] of options.tokens.entries()) {
    const generatorUri = token.generatorUri ?? token.artifactUri
    if (!generatorUri) continue
    const parts = contentParts(generatorUri)
    const localPath = `${safeSegment(token.chain)}/${safeSegment(token.contract)}/${safeSegment(token.tokenId)}`
    const tokenDir = join(outDir, localPath)
    const artifactDir = join(tokenDir, "artifact")
    await mkdir(artifactDir, { recursive: true })
    options.onProgress?.(`[${index + 1}/${options.tokens.length}] ${token.name ?? localPath}`)
    await writeFile(join(tokenDir, "metadata.json"), stringify(token.raw))
    await archiveImage(token, "thumbnail", token.thumbnailUri, tokenDir, options.fetchUri).catch(
      error => options.onProgress?.(`  thumbnail skipped: ${String(error)}`),
    )
    await archiveImage(token, "display", token.displayUri, tokenDir, options.fetchUri).catch(
      error => options.onProgress?.(`  display skipped: ${String(error)}`),
    )
    let files: number
    if (parts.scheme === "ipfs") {
      const car = await fetchCar(parts.cid, options.gateways, options.fetcher)
      const extracted = extractCar(car.bytes, parts.cid)
      await writeExtractedCar(extracted, artifactDir)
      files = extracted.files.size
      options.onProgress?.(`  verified ${extracted.blocks} CAR blocks from ${car.gateway}`)
    } else {
      files = await archiveOnchfs(token, parts.cid, parts.path, artifactDir)
    }
    const entry = parts.path || "index.html"
    await stat(join(artifactDir, entry))
    await writeFile(join(tokenDir, "index.html"), tokenWrapper(token, entry))
    const integrity = await fileHashes(tokenDir)
    await writeFile(join(tokenDir, "integrity.json"), stringify(integrity))
    archived.push({
      chain: token.chain,
      contract: token.contract,
      tokenId: token.tokenId,
      name: token.name,
      path: localPath,
      artifact: parts.scheme,
      files,
    })
  }
  if (archived.length === 0)
    throw new Error("Tokens were found, but none had an archiveable generator")
  const manifest: ArchiveManifest = {
    format: 1,
    createdAt: new Date().toISOString(),
    addresses: options.addresses,
    tokens: archived,
  }
  await writeFile(join(outDir, "manifest.json"), stringify(manifest))
  await writeFile(join(outDir, "index.html"), gallery(manifest))
  await verifyArchive(outDir)
  return manifest
}

export async function archiveWallets(options: ArchiveOptions): Promise<ArchiveManifest> {
  const fetcher = options.fetch ?? globalThis.fetch
  const gateways = options.gateways ?? [...DEFAULT_IPFS_GATEWAYS]
  const client = createWhitehashClient({
    resolver: { ipfsGateways: gateways, onchfs: null },
  })
  const discovered = new Map<string, WhitehashToken>()
  for (const address of options.addresses) {
    options.onProgress?.(`Reading ${address}`)
    const tokens = await client.getWalletTokens(address, {
      chains: options.chains,
      onProgress: event => options.onProgress?.(`  ${event.chain}: ${event.message}`),
    })
    for (const token of tokens)
      discovered.set(`${token.chain}/${token.contract}/${token.tokenId}`, token)
  }
  const selected = [...discovered.values()].slice(0, options.limit)
  if (selected.length === 0) throw new Error("No supported artwork tokens found")
  return writeArchive({
    tokens: selected,
    addresses: options.addresses,
    outDir: options.outDir,
    gateways,
    fetcher,
    fetchUri: client.fetchUri,
    onProgress: options.onProgress,
  })
}

/** Read exactly one normalized token and preserve it as a verified offline archive. */
export async function archiveToken(options: ArchiveTokenOptions): Promise<ArchiveManifest> {
  const gateways = options.gateways ?? [...DEFAULT_IPFS_GATEWAYS]
  const client = createWhitehashClient({
    resolver: { ipfsGateways: gateways, onchfs: null },
  })
  const token = await client.getToken({
    chain: options.chain,
    contract: options.contract,
    tokenId: options.tokenId,
  })
  if (!token) {
    throw new Error(`No supported token found for ${options.contract} #${options.tokenId}`)
  }
  return writeArchive({
    tokens: [token],
    addresses: [],
    outDir: options.outDir,
    gateways,
    fetcher: options.fetch ?? globalThis.fetch,
    fetchUri: client.fetchUri,
    onProgress: options.onProgress,
  })
}

export { resolveFxhashHostedTokenUrl } from "./fxhash-resolver.js"
export type {
  FxhashHostedResolverOptions,
  ResolvedFxhashToken,
} from "./fxhash-resolver.js"
