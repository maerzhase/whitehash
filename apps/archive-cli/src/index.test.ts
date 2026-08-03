import { describe, expect, it } from "vitest"
import { formatOfflineResult, formatOnchainResult, parseArgs } from "./index.js"

const tezosUrl = "https://www.fxhash.xyz/gentk/KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE-16333"
const evmUrl = "https://www.fxhash.xyz/gentk/0x50c04A6B066d659Fe2F66F6388Cf8dD394036632-2953"

describe("archive CLI arguments", () => {
  it("shows general and command-specific help without an error", () => {
    expect(parseArgs([])).toEqual({ kind: "help" })
    expect(parseArgs(["--help"])).toEqual({ kind: "help" })
    expect(parseArgs(["help", "project"])).toEqual({
      kind: "help",
      topic: "project",
    })
    expect(parseArgs(["token", "--help"])).toEqual({
      kind: "help",
      topic: "token",
    })
    expect(parseArgs(["save", "--help"])).toEqual({
      kind: "help",
      topic: "save",
    })
  })

  it("archives an identity-bearing Tezos URL through shorthand or save", () => {
    const expected = {
      kind: "save-token",
      chain: "tezos:mainnet",
      contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
      tokenId: "16333",
      output: "archive",
      out: "whitehash-token-16333",
    }
    expect(parseArgs([tezosUrl])).toEqual(expected)
    expect(parseArgs(["save", tezosUrl])).toEqual(expected)
  })

  it("writes token JSON with its own default or an explicit output file", () => {
    expect(parseArgs([tezosUrl, "--json"])).toMatchObject({
      kind: "save-token",
      output: "json",
      out: "token-index-16333.json",
    })
    expect(parseArgs([tezosUrl, "--json", "--out", "./public/token.json"])).toMatchObject({
      kind: "save-token",
      output: "json",
      out: "./public/token.json",
    })
  })

  it("accepts a serialized Whitehash token ref and preserves its chain", () => {
    expect(
      parseArgs(["whitehash://token/eip155:8453/0x50c04A6B066d659Fe2F66F6388Cf8dD394036632/2953"]),
    ).toMatchObject({
      kind: "save-token",
      chain: "eip155:8453",
      contract: "0x50c04A6B066d659Fe2F66F6388Cf8dD394036632",
      tokenId: "2953",
    })
  })

  it("requires and validates explicit chain identity for URL inputs", () => {
    expect(() => parseArgs([evmUrl])).toThrow("EVM token URL needs a chain")
    expect(parseArgs([evmUrl, "--chain", "base"])).toMatchObject({
      kind: "save-token",
      chain: "eip155:8453",
    })
    expect(() => parseArgs([tezosUrl, "--chain", "base"])).toThrow("KT1 token contract is Tezos")
    expect(() =>
      parseArgs([
        "token/eip155:8453/0x50c04A6B066d659Fe2F66F6388Cf8dD394036632/2953",
        "--chain",
        "ethereum",
      ]),
    ).toThrow("conflicts")
  })

  it("rejects slug-only and project fxhash URLs without treating them as wallets", () => {
    expect(() => parseArgs(["https://fxhash.xyz/iteration/my-project"])).toThrow(
      "--resolver fxhash",
    )
    expect(() => parseArgs(["https://fxhash.xyz/gentk/slug/my-token"])).toThrow("--resolver fxhash")
    expect(() => parseArgs(["https://fxhash.xyz/project/my-project"])).toThrow(
      "collection, not one token",
    )
  })

  it("opts slug-only iteration URLs into hosted identity resolution", () => {
    expect(
      parseArgs(["https://fxhash.xyz/iteration/monogrid-1.1-ce-256", "--resolver", "fxhash"]),
    ).toEqual({
      kind: "resolve-save-token",
      input: "https://fxhash.xyz/iteration/monogrid-1.1-ce-256",
      chain: undefined,
      output: "archive",
      out: undefined,
      resolver: "fxhash",
    })
    expect(
      parseArgs([
        "save",
        "https://fxhash.xyz/gentk/slug/monogrid-1.1-ce-256",
        "--resolver",
        "fxhash",
        "--json",
        "--out",
        "./token.json",
        "--chain",
        "tezos",
      ]),
    ).toMatchObject({
      kind: "resolve-save-token",
      chain: "tezos:mainnet",
      output: "json",
      out: "./token.json",
    })
    expect(() =>
      parseArgs(["https://fxhash.xyz/iteration/monogrid-1.1-ce-256", "--resolver", "unknown"]),
    ).toThrow('only "fxhash"')
  })

  it("parses project index commands", () => {
    expect(
      parseArgs([
        "project",
        "v2:13944",
        "--chain",
        "tezos",
        "--out",
        "fixtures/monogrid.json",
        "--page-size",
        "50",
        "--source",
        "rpc",
      ]),
    ).toEqual({
      kind: "index-project",
      project: "v2:13944",
      chain: "tezos:mainnet",
      outFile: "fixtures/monogrid.json",
      pageSize: 50,
      source: "rpc",
    })
  })

  it("keeps serialized project refs as backward-compatible input", () => {
    expect(parseArgs(["index", "project/tezos:mainnet/v2:13944"])).toEqual({
      kind: "index-project",
      project: "project/tezos:mainnet/v2:13944",
      chain: undefined,
      outFile: "project-index-v2-13944.json",
      pageSize: undefined,
      source: "indexer",
    })
  })

  it("infers friendly project prefixes and exposes direct discovery as one flag", () => {
    expect(
      parseArgs(["project", "base:0x50c04A6B066d659Fe2F66F6388Cf8dD394036632", "--direct"]),
    ).toEqual({
      kind: "index-project",
      project: "0x50c04A6B066d659Fe2F66F6388Cf8dD394036632",
      chain: "eip155:8453",
      outFile: "project-index-0x50c04a6b.json",
      pageSize: undefined,
      source: "rpc",
    })
  })

  it("parses market backfill commands with defaults and full options", () => {
    expect(parseArgs(["market", "v2:13944"])).toEqual({
      kind: "index-market",
      project: "v2:13944",
      chain: "tezos:mainnet",
      outFile: "market-index-v2-13944.json",
      update: undefined,
      jsonOnly: undefined,
      source: undefined,
    })
    expect(
      parseArgs([
        "market",
        "base:0x50c04A6B066d659Fe2F66F6388Cf8dD394036632",
        "--out",
        "fixtures/market.json",
        "--update",
        "fixtures/previous.json",
        "--json-only",
        "--source",
        "rpc",
      ]),
    ).toEqual({
      kind: "index-market",
      project: "0x50c04A6B066d659Fe2F66F6388Cf8dD394036632",
      chain: "eip155:8453",
      outFile: "fixtures/market.json",
      update: "fixtures/previous.json",
      jsonOnly: true,
      source: "rpc",
    })
    expect(parseArgs(["market", "--help"])).toEqual({ kind: "help", topic: "market" })
    expect(parseArgs(["help", "market"])).toEqual({ kind: "help", topic: "market" })
    expect(() => parseArgs(["market"])).toThrow(/Missing project ID/)
    expect(() => parseArgs(["market", "v2:13944", "--frobnicate"])).toThrow(/Unknown market option/)
  })

  it("parses Tezos and EVM token index commands", () => {
    expect(parseArgs(["token", "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE", "16333"])).toEqual({
      kind: "index-token",
      chain: "tezos:mainnet",
      contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
      tokenId: "16333",
      outFile: "token-index-16333.json",
    })
    expect(
      parseArgs([
        "token",
        "base:0x50c04A6B066d659Fe2F66F6388Cf8dD394036632",
        "2953",
        "--out",
        "dom2-2953.json",
      ]),
    ).toEqual({
      kind: "index-token",
      chain: "eip155:8453",
      contract: "0x50c04A6B066d659Fe2F66F6388Cf8dD394036632",
      tokenId: "2953",
      outFile: "dom2-2953.json",
    })
  })

  it("explains how to disambiguate an unprefixed EVM project", () => {
    expect(() => parseArgs(["project", "0x50c04A6B066d659Fe2F66F6388Cf8dD394036632"])).toThrow(
      "Prefix it with base: or ethereum:",
    )
  })

  it("keeps wallet archive and verification commands compatible", () => {
    expect(parseArgs(["tz1abc", "--chains", "tezos", "--limit", "2"])).toEqual({
      kind: "archive",
      addresses: ["tz1abc"],
      chains: ["tezos:mainnet"],
      outDir: "whitehash-archive",
      limit: 2,
    })
    expect(parseArgs(["--verify", "./archive"])).toEqual({
      kind: "verify",
      root: "./archive",
    })
    expect(parseArgs(["wallet", "tz1abc"])).toEqual({
      kind: "archive",
      addresses: ["tz1abc"],
      chains: undefined,
      outDir: "whitehash-archive",
      limit: undefined,
    })
    expect(parseArgs(["archive", "wallet", "tz1abc"])).toEqual({
      kind: "archive",
      addresses: ["tz1abc"],
      chains: undefined,
      outDir: "whitehash-archive",
      limit: undefined,
    })
    expect(parseArgs(["verify", "archive", "./archive"])).toEqual({
      kind: "verify",
      root: "./archive",
    })
    expect(parseArgs(["verify", "./archive", "--onchain"])).toEqual({
      kind: "verify",
      root: "./archive",
      onchain: true,
    })
    expect(parseArgs(["verify", "--onchain", "./archive"])).toEqual({
      kind: "verify",
      root: "./archive",
      onchain: true,
    })
    expect(parseArgs(["verify", "--help"])).toEqual({
      kind: "help",
      topic: "verify",
    })
    expect(() => parseArgs(["verify", "--onchain"])).toThrow("Missing archive folder")
    expect(() => parseArgs(["verify", "./archive", "--chain", "base"])).toThrow(
      "Unknown verify option",
    )
  })
})

describe("archive verification output", () => {
  it("explains a successful offline verification in plain language", () => {
    expect(formatOfflineResult({ tokens: 1, files: 11 })).toBe(
      [
        "✓ Archive is intact",
        "  1 token · 11 files checked",
        "  Local hashes, files, references, and paths all passed.",
      ].join("\n"),
    )
  })

  it("explains an onchain match and its limits", () => {
    const output = formatOnchainResult({
      status: "match",
      offline: { tokens: 1, files: 11 },
      scope: "current",
      historical: "unavailable",
      ownership: "not-checked",
      trust: "unused legacy detail",
      tokens: [
        {
          chain: "tezos:mainnet",
          contract: "KT1abc",
          tokenId: "16333",
          status: "match",
          checks: [],
          observedAt: "2026-07-29T00:00:00.000Z",
          message:
            "Current provider-observed identity and recorded state match the archived snapshot.",
        },
      ],
    })
    expect(output).toContain("✓ Matches the archived snapshot")
    expect(output).toContain("Tezos · token 16333")
    expect(output).toContain("This compares the archive with current public provider data.")
    expect(output).not.toContain("unused legacy detail")
  })
})
