#!/usr/bin/env node
import { archiveToken, archiveWallets, verifyArchive, verifyArchiveOnchain } from "./archive.js"
import { resolveFxhashHostedTokenUrl } from "./fxhash-resolver.js"
import { writeProjectIndex } from "./project-index.js"
import { writeTokenIndex } from "./token-index.js"
import { parseFxhashTokenUrl, parseRef, type ChainId } from "@whitehash/chain-reader"
import { resolveChainId } from "@whitehash/core"
import { pathToFileURL } from "node:url"

const HELP = `whitehash archive
Create portable indexes and preserve wallet collections from public chain data.

Start here
  whitehash-archive "https://www.fxhash.xyz/gentk/KT1…-16333"
  whitehash-archive "https://fxhash.xyz/iteration/project-slug-42" --resolver fxhash
  whitehash-archive project v2:13944
  whitehash-archive token KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE 16333
  whitehash-archive wallet tz1…

Commands
  save                Archive one token URL or ref; add --json for a portable index
  project             Write one JSON index containing a project and its iterations
  token               Write one JSON index containing a token
  wallet              Download owned artwork into an offline gallery
  verify              Verify an archive offline; add --onchain for a current chain comparison

Learn one command
  whitehash-archive help save
  whitehash-archive help project
  whitehash-archive help token
  whitehash-archive help wallet
  whitehash-archive help verify`

const SAVE_HELP = `Archive one fxhash token from an identity-bearing URL or Whitehash ref

Usage
  whitehash-archive <token-input> [--chain <chain>] [--out <folder>]
  whitehash-archive save <token-input> [--chain <chain>] [--out <folder>]
  whitehash-archive <token-input> --json [--chain <chain>] [--out <file>]

Examples
  whitehash-archive "https://www.fxhash.xyz/gentk/KT1…-16333"
  whitehash-archive "token/tezos:mainnet/KT1…/16333" --json
  whitehash-archive "https://fxhash.xyz/gentk/0x…-2953" --chain base
  whitehash-archive "https://fxhash.xyz/iteration/project-slug-42" --resolver fxhash

Options
  --json              Write a portable token JSON index instead of an offline archive
  --out <path>        Output folder in archive mode, or file in JSON mode
  --chain <chain>     Required for EVM identity URLs; accepts a name or full chain ID
  --resolver fxhash   Resolve a slug-only iteration through fxhash's hosted service`

const PROJECT_HELP = `Index one fxhash project

Usage
  whitehash-archive project <project-id> [options]

Examples
  whitehash-archive project v2:13944
  whitehash-archive project base:0x50c04A6B066d659Fe2F66F6388Cf8dD394036632
  whitehash-archive project ethereum:0x76e27D6C7B8324fD42Fe21D63DA5195551dc1cc4

Common options
  --out <file>        Output JSON file (default: project-index-<id>.json)
  --direct            Discover EVM token IDs directly from the contract
  --chain <chain>     Required only for an unprefixed EVM address

Advanced options
  --page-size <n>     Tune indexer page size
  --source <mode>     indexer (default) or rpc; --direct is the rpc shortcut

Tezos IDs such as v2:13944 imply Tezos mainnet. For EVM, prefix the address
with base: or ethereum:, or pass --chain explicitly.`

const TOKEN_HELP = `Index one fxhash token

Usage
  whitehash-archive token <contract> <token-id> [options]

Examples
  whitehash-archive token KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE 16333
  whitehash-archive token base:0x50c04A6B066d659Fe2F66F6388Cf8dD394036632 2953
  whitehash-archive token ethereum:0x76e27D6C7B8324fD42Fe21D63DA5195551dc1cc4 1

Options
  --out <file>        Output JSON file (default: token-index-<id>.json)
  --chain <chain>     Required only for an unprefixed EVM contract

Tezos KT1 contracts imply Tezos mainnet. For EVM, prefix the contract with
base: or ethereum:, or pass --chain explicitly.`

const WALLET_HELP = `Archive artwork owned by one or more wallets

Usage
  whitehash-archive wallet <address…> [options]

Examples
  whitehash-archive wallet tz1…
  whitehash-archive wallet 0x… --chains ethereum,base

Options
  --chains <chains>    Comma-separated chains to scan
  --out <folder>       Output folder (default: whitehash-archive)
  --limit <n>          Archive only the first n discovered tokens`

const VERIFY_HELP = `Verify an offline archive

Usage
  whitehash-archive verify <archive-folder>
  whitehash-archive verify <archive-folder> --onchain

Without flags, verify checks local hashes, files, references, and path safety
without network access. --onchain first runs that unchanged offline verification,
then reads each exact recorded chain, contract, and token ID through Whitehash's
configured public infrastructure and compares current normalized references with
the archive snapshot.

The onchain result is current provider-observed state, not a signed proof,
provider consensus, ownership check, or historical verification at the archive
creation time. Provider failures are reported as unavailable; legacy archives
without a recorded snapshot are reported as unverifiable.`

class UsageError extends Error {}

function usage(message: string): never {
  throw new UsageError(message)
}

interface ArchiveCommand {
  kind: "archive"
  addresses: string[]
  chains?: ChainId[]
  outDir: string
  limit?: number
}

interface IndexProjectCommand {
  kind: "index-project"
  project: string
  chain?: ChainId
  outFile: string
  pageSize?: number
  source: "indexer" | "rpc"
}

interface IndexTokenCommand {
  kind: "index-token"
  chain: ChainId
  contract: string
  tokenId: string
  outFile: string
}

interface SaveTokenCommand {
  kind: "save-token"
  chain: ChainId
  contract: string
  tokenId: string
  output: "archive" | "json"
  out: string
}

interface ResolveSaveTokenCommand {
  kind: "resolve-save-token"
  input: string
  chain?: ChainId
  output: "archive" | "json"
  out?: string
  resolver: "fxhash"
}

interface HelpCommand {
  kind: "help"
  topic?: "save" | "project" | "token" | "wallet" | "verify"
}

interface VerifyCommand {
  kind: "verify"
  root: string
  onchain?: true
}

type Command =
  | ArchiveCommand
  | IndexProjectCommand
  | IndexTokenCommand
  | SaveTokenCommand
  | ResolveSaveTokenCommand
  | VerifyCommand
  | HelpCommand

function positiveInteger(value: string | undefined): number {
  if (value === undefined) usage("Expected a positive number after the option.")
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    usage(`Expected a positive number, received "${value}".`)
  }
  return parsed
}

function chainId(value: string | undefined): ChainId {
  if (!value) usage("Expected a chain name after the option.")
  const resolved = resolveChainId(value)
  if (!resolved) {
    usage(`Unknown chain "${value}". Use tezos, ethereum, base, or a full chain ID.`)
  }
  return resolved
}

function projectInput(
  value: string,
  explicitChain?: ChainId,
): { project: string; chain?: ChainId } {
  if (/^(?:whitehash:\/\/)?\/?project\//.test(value)) {
    return { project: value, chain: explicitChain }
  }
  if (/^v[0-3]:\d+$/.test(value)) {
    if (explicitChain && !explicitChain.startsWith("tezos:")) {
      usage(`${value} is a Tezos project ID, but --chain selected ${explicitChain}.`)
    }
    return { project: value, chain: explicitChain ?? "tezos:mainnet" }
  }
  for (const prefix of ["base", "ethereum", "eth"] as const) {
    if (value.startsWith(`${prefix}:`)) {
      const inferred = chainId(prefix)
      if (explicitChain && explicitChain !== inferred) {
        usage(`Project prefix ${prefix}: conflicts with --chain ${explicitChain}.`)
      }
      return { project: value.slice(prefix.length + 1), chain: inferred }
    }
  }
  if (/^0x[0-9a-fA-F]{40}$/.test(value) && !explicitChain) {
    usage("An EVM project address needs a chain. Prefix it with base: or ethereum:.")
  }
  if (!explicitChain) {
    usage(`Cannot infer a chain for "${value}". Run "whitehash-archive help project".`)
  }
  return { project: value, chain: explicitChain }
}

function projectOutput(project: string): string {
  const identity = decodeURIComponent(project.split("/").at(-1) ?? project)
  const short = identity.startsWith("0x") ? identity.slice(0, 10) : identity
  const safe = short
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return `project-index-${safe || "project"}.json`
}

function tokenInput(
  contractValue: string,
  tokenIdValue: string | undefined,
  explicitChain?: ChainId,
): { chain: ChainId; contract: string; tokenId: string } {
  if (/^(?:whitehash:\/\/)?\/?token\//.test(contractValue)) {
    const ref = parseRef(contractValue, "token")
    if (explicitChain && explicitChain !== ref.chain) {
      usage(`Token ref uses ${ref.chain}, but --chain selected ${explicitChain}.`)
    }
    return { chain: ref.chain, contract: ref.contract, tokenId: ref.tokenId }
  }
  if (!tokenIdValue) {
    usage("Missing token ID after the contract address.")
  }
  if (contractValue.startsWith("KT1")) {
    if (explicitChain && !explicitChain.startsWith("tezos:")) {
      usage(`A KT1 token contract is Tezos, but --chain selected ${explicitChain}.`)
    }
    return {
      chain: explicitChain ?? "tezos:mainnet",
      contract: contractValue,
      tokenId: tokenIdValue,
    }
  }
  for (const prefix of ["base", "ethereum", "eth"] as const) {
    if (contractValue.startsWith(`${prefix}:`)) {
      const inferred = chainId(prefix)
      if (explicitChain && explicitChain !== inferred) {
        usage(`Token prefix ${prefix}: conflicts with --chain ${explicitChain}.`)
      }
      return {
        chain: inferred,
        contract: contractValue.slice(prefix.length + 1),
        tokenId: tokenIdValue,
      }
    }
  }
  if (/^0x[0-9a-fA-F]{40}$/.test(contractValue) && !explicitChain) {
    usage("An EVM token contract needs a chain. Prefix it with base: or ethereum:.")
  }
  if (!explicitChain) {
    usage(`Cannot infer a chain for "${contractValue}". Run "whitehash-archive help token".`)
  }
  return { chain: explicitChain, contract: contractValue, tokenId: tokenIdValue }
}

function safeTokenId(tokenId: string): string {
  return (
    tokenId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "token"
  )
}

function tokenOutput(tokenId: string): string {
  return `token-index-${safeTokenId(tokenId)}.json`
}

function tokenArchiveOutput(tokenId: string): string {
  return `whitehash-token-${safeTokenId(tokenId)}`
}

const SLUG_ONLY_ERROR =
  "This fxhash URL contains only a slug, not an on-chain token identity. Use --resolver fxhash to resolve it through fxhash's hosted service, or use a token URL containing <contract>-<tokenId>, a Whitehash token ref, or pass the contract and token ID."

function isFxhashUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.hostname === "fxhash.xyz" || url.hostname === "www.fxhash.xyz"
  } catch {
    return false
  }
}

function isSlugOnlyFxhashUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.hostname !== "fxhash.xyz" && url.hostname !== "www.fxhash.xyz") return false
    const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent)
    return (
      (parts[0] === "iteration" && parts[1] !== "id") ||
      (parts[0] === "gentk" && parts[1] === "slug") ||
      parts[0] === "project"
    )
  } catch {
    return false
  }
}

function isResolvableFxhashIterationUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.hostname !== "fxhash.xyz" && url.hostname !== "www.fxhash.xyz") return false
    const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent)
    return (
      (parts[0] === "iteration" && parts.length === 2) ||
      (parts[0] === "gentk" && parts[1] === "slug" && parts.length === 3)
    )
  } catch {
    return false
  }
}

function isFxhashProjectUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      (url.hostname === "fxhash.xyz" || url.hostname === "www.fxhash.xyz") &&
      url.pathname.split("/").filter(Boolean)[0] === "project"
    )
  } catch {
    return false
  }
}

function saveTokenInput(value: string, explicitChain?: ChainId) {
  if (/^(?:whitehash:\/\/)?\/?token\//.test(value)) {
    const ref = parseRef(value, "token")
    if (explicitChain && explicitChain !== ref.chain) {
      usage(`Token ref ${ref.chain} conflicts with --chain ${explicitChain}.`)
    }
    return { chain: ref.chain, contract: ref.contract, tokenId: ref.tokenId }
  }
  const coordinates = parseFxhashTokenUrl(value)
  if (!coordinates) {
    if (isSlugOnlyFxhashUrl(value)) usage(SLUG_ONLY_ERROR)
    usage(
      isFxhashUrl(value)
        ? "This fxhash URL does not contain a supported on-chain token identity."
        : "Save expects an identity-bearing fxhash token URL or serialized Whitehash token ref.",
    )
  }
  if (coordinates.contract.startsWith("KT1")) {
    if (explicitChain && !explicitChain.startsWith("tezos:")) {
      usage(`A KT1 token contract is Tezos, but --chain selected ${explicitChain}.`)
    }
    return { chain: explicitChain ?? "tezos:mainnet", ...coordinates }
  }
  if (!explicitChain) {
    usage(
      "An EVM token URL needs a chain. Pass --chain base, --chain ethereum, or a full chain ID.",
    )
  }
  if (!explicitChain.startsWith("eip155:")) {
    usage(`An EVM token URL cannot use Tezos chain ${explicitChain}.`)
  }
  return { chain: explicitChain, ...coordinates }
}

function parseSaveToken(args: string[]): SaveTokenCommand | ResolveSaveTokenCommand {
  const input = args[0]
  if (!input) usage('Missing token input. Run "whitehash-archive help save".')
  let explicitChain: ChainId | undefined
  let out: string | undefined
  let output: SaveTokenCommand["output"] = "archive"
  let resolver: "fxhash" | undefined
  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index]!
    if (arg === "--json") output = "json"
    else if (arg === "--out") {
      const value = args[++index]
      if (!value) usage("Expected a path after --out.")
      out = value
    } else if (arg === "--chain") explicitChain = chainId(args[++index])
    else if (arg === "--resolver") {
      const value = args[++index]
      if (value !== "fxhash") usage('--resolver currently accepts only "fxhash".')
      resolver = value
    } else usage(`Unknown save option "${arg}".`)
  }
  if (isFxhashProjectUrl(input)) {
    usage("This fxhash project URL identifies a collection, not one token. Use an iteration URL.")
  }
  if (isResolvableFxhashIterationUrl(input)) {
    if (!resolver) usage(SLUG_ONLY_ERROR)
    return {
      kind: "resolve-save-token",
      input,
      chain: explicitChain,
      output,
      out,
      resolver,
    }
  }
  const token = saveTokenInput(input, explicitChain)
  return {
    kind: "save-token",
    ...token,
    output,
    out:
      out ?? (output === "json" ? tokenOutput(token.tokenId) : tokenArchiveOutput(token.tokenId)),
  }
}

async function runSaveToken(command: SaveTokenCommand): Promise<void> {
  if (command.output === "json") {
    console.log(`Indexing ${command.contract} #${command.tokenId} on ${command.chain}`)
    await writeTokenIndex({
      chain: command.chain,
      contract: command.contract,
      tokenId: command.tokenId,
      outFile: command.out,
    })
    console.log(`Wrote token index to ${command.out}`)
    console.log("Next: load the JSON with parseTokenIndex().")
    return
  }
  console.log(`Archiving ${command.contract} #${command.tokenId} on ${command.chain}`)
  const manifest = await archiveToken({
    chain: command.chain,
    contract: command.contract,
    tokenId: command.tokenId,
    outDir: command.out,
    onProgress: message => console.log(message),
  })
  console.log(`Archived ${manifest.tokens.length} token to ${command.out}`)
  console.log(
    `Next: open ${command.out}/index.html or run whitehash-archive verify ${command.out}.`,
  )
}

export function parseArgs(args: string[]): Command {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    return { kind: "help" }
  }
  if (args[0] === "help") {
    const words = args.slice(1)
    const topic = words.at(-1)
    if (
      topic !== undefined &&
      topic !== "save" &&
      topic !== "project" &&
      topic !== "token" &&
      topic !== "wallet" &&
      topic !== "verify"
    ) {
      usage(`No help topic named "${words.join(" ")}".`)
    }
    return { kind: "help", topic }
  }
  if (args[0] === "save") {
    const saveArgs = args.slice(1)
    if (saveArgs[0] === "--help" || saveArgs[0] === "-h") {
      return { kind: "help", topic: "save" }
    }
    return parseSaveToken(saveArgs)
  }
  if (
    /^(?:whitehash:\/\/)?\/?token\//.test(args[0]!) ||
    parseFxhashTokenUrl(args[0]!) ||
    isFxhashUrl(args[0]!)
  ) {
    return parseSaveToken(args)
  }
  const canonicalProject = args[0] === "project"
  const aliasedProject = args[0] === "index" && args[1] === "project"
  const legacyProject = args[0] === "index" && args[1] !== "token" && args[1] !== "project"
  if (canonicalProject || aliasedProject || legacyProject) {
    const projectArgs = aliasedProject ? args.slice(2) : args.slice(1)
    if (projectArgs[0] === "--help" || projectArgs[0] === "-h") {
      return { kind: "help", topic: "project" }
    }
    const rawProject = projectArgs[0]
    if (!rawProject) {
      usage('Missing project ID. Try "whitehash-archive project v2:13944".')
    }
    let chain: ChainId | undefined
    let outFile: string | undefined
    let pageSize: number | undefined
    let source: "indexer" | "rpc" = "indexer"
    for (let index = 1; index < projectArgs.length; index += 1) {
      const arg = projectArgs[index]!
      if (arg === "--out") {
        const value = projectArgs[++index]
        if (!value) usage("Expected a filename after --out.")
        outFile = value
      } else if (arg === "--chain") chain = chainId(projectArgs[++index])
      else if (arg === "--page-size") pageSize = positiveInteger(projectArgs[++index])
      else if (arg === "--direct") source = "rpc"
      else if (arg === "--source") {
        const value = projectArgs[++index]
        if (value !== "indexer" && value !== "rpc") {
          usage('--source must be either "indexer" or "rpc".')
        }
        source = value
      } else usage(`Unknown project option "${arg}".`)
    }
    const { project, chain: resolvedChain } = projectInput(rawProject, chain)
    return {
      kind: "index-project",
      project,
      chain: resolvedChain,
      outFile: outFile ?? projectOutput(project),
      pageSize,
      source,
    }
  }

  const canonicalToken = args[0] === "token"
  const aliasedToken = args[0] === "index" && args[1] === "token"
  if (canonicalToken || aliasedToken) {
    const tokenArgs = aliasedToken ? args.slice(2) : args.slice(1)
    if (tokenArgs[0] === "--help" || tokenArgs[0] === "-h") {
      return { kind: "help", topic: "token" }
    }
    const contractValue = tokenArgs[0]
    if (!contractValue) {
      usage('Missing token contract. Run "whitehash-archive help token".')
    }
    const serialized = /^(?:whitehash:\/\/)?\/?token\//.test(contractValue)
    const tokenIdValue = serialized ? undefined : tokenArgs[1]
    let chain: ChainId | undefined
    let outFile: string | undefined
    const optionStart = serialized ? 1 : 2
    for (let index = optionStart; index < tokenArgs.length; index += 1) {
      const arg = tokenArgs[index]!
      if (arg === "--out") {
        const value = tokenArgs[++index]
        if (!value) usage("Expected a filename after --out.")
        outFile = value
      } else if (arg === "--chain") chain = chainId(tokenArgs[++index])
      else usage(`Unknown token option "${arg}".`)
    }
    const token = tokenInput(contractValue, tokenIdValue, chain)
    return {
      kind: "index-token",
      ...token,
      outFile: outFile ?? tokenOutput(token.tokenId),
    }
  }

  if (args[0] === "verify" || args[0] === "--verify") {
    const canonical = args[1] === "archive"
    const verifyArgs = args.slice(canonical ? 2 : 1)
    if (verifyArgs.includes("--help") || verifyArgs.includes("-h")) {
      return { kind: "help", topic: "verify" }
    }
    let root: string | undefined
    let onchain: true | undefined
    for (const arg of verifyArgs) {
      if (arg === "--onchain") onchain = true
      else if (arg.startsWith("-")) usage(`Unknown verify option "${arg}".`)
      else if (root === undefined) root = arg
      else usage(`Unexpected verify argument "${arg}".`)
    }
    if (!root) {
      usage('Missing archive folder. Try "whitehash-archive verify archive ./whitehash-archive".')
    }
    return { kind: "verify", root, ...(onchain ? { onchain } : {}) }
  }

  const canonicalWallet = args[0] === "archive" && args[1] === "wallet"
  const walletArgs = canonicalWallet ? args.slice(2) : args[0] === "wallet" ? args.slice(1) : args
  if (walletArgs[0] === "--help" || walletArgs[0] === "-h") {
    return { kind: "help", topic: "wallet" }
  }
  const addresses: string[] = []
  let chains: ChainId[] | undefined
  let outDir = "whitehash-archive"
  let limit: number | undefined
  for (let index = 0; index < walletArgs.length; index += 1) {
    const arg = walletArgs[index]!
    if (arg === "--chains") {
      const value = walletArgs[++index]
      if (!value) usage("Expected a comma-separated chain list after --chains.")
      chains = value.split(",").map(item => chainId(item))
    } else if (arg === "--out") {
      const value = walletArgs[++index]
      if (!value) usage("Expected a folder after --out.")
      outDir = value
    } else if (arg === "--limit") limit = positiveInteger(walletArgs[++index])
    else if (arg.startsWith("-")) usage(`Unknown wallet option "${arg}".`)
    else addresses.push(arg)
  }
  if (addresses.length === 0) {
    usage('Missing wallet address. Try "whitehash-archive wallet tz1…".')
  }
  return { kind: "archive", addresses, chains, outDir, limit }
}

export async function main(args: string[]): Promise<void> {
  const command = parseArgs(args)
  if (command.kind === "help") {
    console.log(
      command.topic === "project"
        ? PROJECT_HELP
        : command.topic === "save"
          ? SAVE_HELP
          : command.topic === "token"
            ? TOKEN_HELP
            : command.topic === "wallet"
              ? WALLET_HELP
              : command.topic === "verify"
                ? VERIFY_HELP
                : HELP,
    )
    return
  }
  if (command.kind === "verify") {
    if (command.onchain) {
      const result = await verifyArchiveOnchain(command.root)
      console.log(
        `Offline verification passed: ${result.offline.tokens} tokens and ${result.offline.files} files.`,
      )
      for (const token of result.tokens) {
        console.log(
          `${token.status.toUpperCase()} ${token.chain}/${token.contract}/${token.tokenId}`,
        )
        console.log(`  ${token.message}`)
        for (const check of token.checks.filter(check => check.status === "mismatch")) {
          console.log(
            `  ${check.field}: archived=${JSON.stringify(check.archived)} current=${JSON.stringify(check.current)}`,
          )
        }
      }
      console.log(
        "Scope: current provider-observed token state. Ownership was not checked; historical verification is unavailable.",
      )
      console.log(result.trust)
      if (result.status !== "match") process.exitCode = 1
      return
    }
    const result = await verifyArchive(command.root)
    console.log(`Verified ${result.tokens} tokens and ${result.files} files.`)
    return
  }
  if (command.kind === "index-project") {
    console.log(`Indexing project ${command.project}${command.chain ? ` on ${command.chain}` : ""}`)
    const index = await writeProjectIndex({
      project: command.project,
      chain: command.chain,
      outFile: command.outFile,
      pageSize: command.pageSize,
      source: command.source,
      onProgress: message => console.log(message),
    })
    const completeness = index.complete ? "complete" : "partial"
    console.log(
      `Wrote ${completeness} index with ${index.iterations.length} iterations to ${command.outFile}`,
    )
    console.log("Next: load the JSON with parseProjectIndex().")
    return
  }
  if (command.kind === "index-token") {
    console.log(`Indexing token ${command.contract} #${command.tokenId} on ${command.chain}`)
    await writeTokenIndex(command)
    console.log(`Wrote token index to ${command.outFile}`)
    console.log("Next: load the JSON with parseTokenIndex().")
    return
  }
  if (command.kind === "resolve-save-token") {
    const token = await resolveFxhashHostedTokenUrl({
      url: command.input,
      chain: command.chain,
      onProgress: message => console.log(message),
    })
    if (command.chain && command.chain !== token.chain) {
      usage(`fxhash resolved ${token.chain}, but --chain selected ${command.chain}.`)
    }
    console.log(`Resolved to ${token.contract} #${token.tokenId} on ${token.chain}`)
    const out =
      command.out ??
      (command.output === "json" ? tokenOutput(token.tokenId) : tokenArchiveOutput(token.tokenId))
    await runSaveToken({
      kind: "save-token",
      ...token,
      output: command.output,
      out,
    })
    return
  }
  if (command.kind === "save-token") {
    await runSaveToken(command)
    return
  }
  console.log(
    `Archiving ${command.addresses.length} wallet${command.addresses.length === 1 ? "" : "s"}`,
  )
  const manifest = await archiveWallets({
    ...command,
    onProgress: message => console.log(message),
  })
  console.log(`Archived ${manifest.tokens.length} tokens to ${command.outDir}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main(process.argv.slice(2)).catch(error => {
    const message = error instanceof Error ? error.message : String(error)
    if (error instanceof UsageError) {
      console.error(`Error: ${message}\n\nRun "whitehash-archive --help" to see examples.`)
    } else {
      console.error(
        process.env.WHITEHASH_DEBUG === "1" && error instanceof Error
          ? (error.stack ?? message)
          : `Error: ${message}`,
      )
    }
    process.exitCode = 1
  })
}

export {
  archiveToken,
  archiveWallets,
  verifyArchive,
  verifyArchiveOnchain,
} from "./archive.js"
export type {
  ArchiveTokenOptions,
  OnchainArchiveVerification,
  OnchainFieldCheck,
  OnchainTokenReader,
  OnchainTokenVerification,
  OnchainVerificationStatus,
  VerifyArchiveOnchainOptions,
} from "./archive.js"
export { resolveFxhashHostedTokenUrl } from "./fxhash-resolver.js"
export type {
  FxhashHostedResolverOptions,
  ResolvedFxhashToken,
} from "./fxhash-resolver.js"
export { extractCar, writeExtractedCar } from "./car.js"
export { writeProjectIndex } from "./project-index.js"
export { writeTokenIndex } from "./token-index.js"
