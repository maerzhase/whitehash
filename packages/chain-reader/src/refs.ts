import { isChainId, type ChainId, type WhitehashToken } from "@whitehash/core"

export interface ProjectRef {
  type: "project"
  chain: ChainId
  id: string
}

export interface TokenRef {
  type: "token"
  chain: ChainId
  contract: string
  tokenId: string
}

/** Project identity accepted by read APIs; `type` is only needed for mixed refs/routes. */
export type ProjectInput = ProjectRef | Pick<ProjectRef, "chain" | "id">

/** Token identity accepted by read APIs; matches the identity fields on WhitehashToken. */
export type TokenInput = TokenRef | Pick<TokenRef, "chain" | "contract" | "tokenId">

export interface AddressInput {
  type: "address"
  address: string
}

export interface ContentInput {
  type: "content"
  uri: string
}

export type WhitehashRef = ProjectRef | TokenRef
export type ResolvedInput = WhitehashRef | AddressInput | ContentInput

const decode = (value: string) => decodeURIComponent(value)
const encode = (value: string) => encodeURIComponent(value)

export function formatRef(ref: WhitehashRef): string {
  if (ref.type === "project") return `project/${encode(ref.chain)}/${encode(ref.id)}`
  return `token/${encode(ref.chain)}/${encode(ref.contract)}/${encode(ref.tokenId)}`
}

export function parseRef(value: string, expected: "project"): ProjectRef
export function parseRef(value: string, expected: "token"): TokenRef
export function parseRef(value: string, expected?: WhitehashRef["type"]): WhitehashRef
export function parseRef(value: string, expected?: WhitehashRef["type"]): WhitehashRef {
  const parts = value
    .trim()
    .replace(/^whitehash:\/\//, "")
    .replace(/^\/+/, "")
    .split("/")
    .map(decode)
  const [type, chain] = parts
  if ((type !== "project" && type !== "token") || !chain || !isChainId(chain)) {
    throw new Error(`Invalid whitehash ref: ${value}`)
  }
  if (expected && type !== expected) throw new Error(`Expected a ${expected} ref`)
  if (type === "project" && parts.length === 3 && parts[2]) {
    return { type, chain, id: parts[2] }
  }
  if (type === "token" && parts.length === 4 && parts[2] && parts[3]) {
    return { type, chain, contract: parts[2], tokenId: parts[3] }
  }
  throw new Error(`Invalid whitehash ref: ${value}`)
}

export function tokenRef(token: Pick<WhitehashToken, "chain" | "contract" | "tokenId">): TokenRef {
  return { type: "token", chain: token.chain, contract: token.contract, tokenId: token.tokenId }
}

export function projectRef(project: ProjectInput): ProjectRef {
  return { type: "project", chain: project.chain, id: project.id }
}

export function shortAddress(address: string, start = 8, end = 4): string {
  if (address.length <= start + end + 1) return address
  return `${address.slice(0, start)}…${address.slice(-end)}`
}

export function projectLabel(project: { name: string | null; id: string }): string {
  return project.name ?? (project.id.startsWith("0x") ? shortAddress(project.id) : project.id)
}

function addressInput(value: string): AddressInput | null {
  if (/^(tz[1-4]|KT1)[1-9A-HJ-NP-Za-km-z]{33}$/.test(value) || /^0x[0-9a-fA-F]{40}$/.test(value)) {
    return { type: "address", address: value }
  }
  return null
}

function contentInput(value: string): ContentInput | null {
  if (/^(ipfs|onchfs):\/\//i.test(value)) return { type: "content", uri: value }
  if (
    /^Qm[1-9A-HJ-NP-Za-km-z]{44}(?:\/.*)?$/.test(value) ||
    /^b[a-z2-7]{20,}(?:\/.*)?$/i.test(value)
  ) {
    return { type: "content", uri: `ipfs://${value}` }
  }
  return null
}

/** Parse refs, addresses, CIDs, and common pasted artwork/project URLs without fetching. */
export function resolveInput(value: string, options: { chain?: ChainId } = {}): ResolvedInput {
  const input = value.trim()
  try {
    return parseRef(input)
  } catch {
    /* Continue through paste-friendly forms. */
  }
  const address = addressInput(input)
  if (address) return address
  const content = contentInput(input)
  if (content) return content

  try {
    const url = new URL(input)
    const parts = url.pathname.split("/").filter(Boolean).map(decode)
    const tokenIndex = parts.findIndex(part => part === "gentk" || part === "token")
    if (tokenIndex >= 0 && parts[tokenIndex + 1] && parts[tokenIndex + 2]) {
      const contract = parts[tokenIndex + 1]!
      const chain = options.chain ?? (contract.startsWith("KT1") ? "tezos:mainnet" : "eip155:1")
      return { type: "token", chain, contract, tokenId: parts[tokenIndex + 2]! }
    }
    const projectIndex = parts.findIndex(part => part === "generative" || part === "project")
    if (projectIndex >= 0 && parts[projectIndex + 1]) {
      return {
        type: "project",
        chain: options.chain ?? "tezos:mainnet",
        id: parts[projectIndex + 1]!,
      }
    }
    const nested = contentInput(url.searchParams.get("uri") ?? "")
    if (nested) return nested
  } catch {
    /* Fall through to one actionable error. */
  }
  throw new Error("Input is not a whitehash ref, address, CID, or supported artwork URL")
}
