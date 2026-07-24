import { describe, expect, it } from "vitest"
import { parseArgs } from "./index.js"

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
    expect(parseArgs([
      "project",
      "base:0x50c04A6B066d659Fe2F66F6388Cf8dD394036632",
      "--direct",
    ])).toEqual({
      kind: "index-project",
      project: "0x50c04A6B066d659Fe2F66F6388Cf8dD394036632",
      chain: "eip155:8453",
      outFile: "project-index-0x50c04a6b.json",
      pageSize: undefined,
      source: "rpc",
    })
  })

  it("parses Tezos and EVM token index commands", () => {
    expect(parseArgs([
      "token",
      "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
      "16333",
    ])).toEqual({
      kind: "index-token",
      chain: "tezos:mainnet",
      contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
      tokenId: "16333",
      outFile: "token-index-16333.json",
    })
    expect(parseArgs([
      "token",
      "base:0x50c04A6B066d659Fe2F66F6388Cf8dD394036632",
      "2953",
      "--out",
      "dom2-2953.json",
    ])).toEqual({
      kind: "index-token",
      chain: "eip155:8453",
      contract: "0x50c04A6B066d659Fe2F66F6388Cf8dD394036632",
      tokenId: "2953",
      outFile: "dom2-2953.json",
    })
  })

  it("explains how to disambiguate an unprefixed EVM project", () => {
    expect(() =>
      parseArgs(["project", "0x50c04A6B066d659Fe2F66F6388Cf8dD394036632"]),
    ).toThrow("Prefix it with base: or ethereum:")
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
  })
})
