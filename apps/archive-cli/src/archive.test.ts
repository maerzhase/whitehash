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

import {
  archiveToken,
  verifyArchive,
  verifyArchiveOnchain,
  type ArchiveManifest,
} from "./archive.js"

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

async function createArchive() {
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
  return { manifest, outDir, token }
}

describe("single-token archives", () => {
  it("writes and verifies the complete shared archive layout", async () => {
    const { manifest, outDir, token } = await createArchive()

    expect(clientMocks.getToken).toHaveBeenCalledWith({
      chain: token.chain,
      contract: token.contract,
      tokenId: token.tokenId,
    })
    expect(manifest.format).toBe(1)
    expect(manifest.addresses).toEqual([])
    expect(manifest.tokens).toHaveLength(1)
    expect(manifest.tokens[0]?.provenance?.state).toEqual({
      iterationHash: token.iterationHash,
      artifactUri: token.artifactUri,
      generatorUri: token.generatorUri,
      metadataUri: token.metadataUri,
      assigned: token.assigned,
    })

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

  it("compares a valid archive with the exact current token identity and state", async () => {
    const { outDir, token } = await createArchive()
    clientMocks.getToken.mockClear()
    clientMocks.getToken.mockResolvedValue(token)

    await expect(verifyArchiveOnchain(outDir)).resolves.toMatchObject({
      status: "match",
      scope: "current",
      historical: "unavailable",
      ownership: "not-checked",
      tokens: [{ status: "match" }],
    })
    expect(clientMocks.getToken).toHaveBeenCalledWith({
      chain: "tezos:mainnet",
      contract: token.contract,
      tokenId: token.tokenId,
    })
  })

  it("reports mutable state differences without calling them local corruption", async () => {
    const { outDir, token } = await createArchive()
    clientMocks.getToken.mockResolvedValue({
      ...token,
      assigned: false,
      iterationHash: null,
      artifactUri: "ipfs://changed/artifact",
    })

    const result = await verifyArchiveOnchain(outDir)
    expect(result.status).toBe("mismatch")
    expect(result.tokens[0]).toMatchObject({
      status: "mismatch",
      message: "Current provider-observed state differs from the archived snapshot.",
    })
    expect(
      result.tokens[0]?.checks
        .filter(check => check.status === "mismatch")
        .map(check => check.field),
    ).toEqual(["iterationHash", "artifactUri", "assigned"])
  })

  it("distinguishes missing tokens, provider failures, and legacy snapshots", async () => {
    const missing = await createArchive()
    clientMocks.getToken.mockResolvedValue(null)
    await expect(verifyArchiveOnchain(missing.outDir)).resolves.toMatchObject({
      status: "mismatch",
      tokens: [{ status: "mismatch" }],
    })

    const unavailable = await createArchive()
    clientMocks.getToken.mockRejectedValue(new Error("RPC timeout"))
    await expect(verifyArchiveOnchain(unavailable.outDir)).resolves.toMatchObject({
      status: "unavailable",
      tokens: [{ status: "unavailable", message: "Provider read unavailable: RPC timeout" }],
    })

    const unavailableMetadata = await createArchive()
    const unavailableManifestPath = join(unavailableMetadata.outDir, "manifest.json")
    const unavailableManifest = JSON.parse(
      await readFile(unavailableManifestPath, "utf8"),
    ) as ArchiveManifest
    unavailableManifest.tokens[0]!.chain = "eip155:8453"
    unavailableManifest.tokens[0]!.contract = "0x50c04A6B066d659Fe2F66F6388Cf8dD394036632"
    await writeFile(unavailableManifestPath, `${JSON.stringify(unavailableManifest, null, 2)}\n`)
    clientMocks.getToken.mockResolvedValue({
      ...unavailableMetadata.token,
      chain: "eip155:8453",
      contract: unavailableManifest.tokens[0]!.contract,
      raw: null,
    })
    await expect(verifyArchiveOnchain(unavailableMetadata.outDir)).resolves.toMatchObject({
      status: "unavailable",
      tokens: [
        {
          status: "unavailable",
          message:
            "The current metadata reference was observed, but its content was unavailable: ipfs://metadata",
        },
      ],
    })

    const legacy = await createArchive()
    const manifestPath = join(legacy.outDir, "manifest.json")
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      tokens: Array<{ provenance?: unknown }>
    }
    delete manifest.tokens[0]?.provenance
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    clientMocks.getToken.mockResolvedValue(legacy.token)
    await expect(verifyArchiveOnchain(legacy.outDir)).resolves.toMatchObject({
      status: "unverifiable",
      tokens: [{ status: "unverifiable", observedAt: null }],
    })
  })

  it("requires offline integrity before making a provider request", async () => {
    const { outDir, token } = await createArchive()
    const tokenDir = join(outDir, token.chain, token.contract, token.tokenId)
    await writeFile(join(tokenDir, "metadata.json"), '{"tampered":true}\n')
    clientMocks.getToken.mockClear()

    await expect(verifyArchiveOnchain(outDir)).rejects.toThrow("Integrity mismatch")
    expect(clientMocks.getToken).not.toHaveBeenCalled()
  })
})
