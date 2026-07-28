import { createHash } from "node:crypto"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createWhitehashClient } from "@whitehash/chain-reader"
import { afterAll, describe, expect, it } from "vitest"
import { verifyArchiveOnchain, type ArchiveManifest } from "./archive.js"

const live = process.env.WHITEHASH_LIVE_TEST === "1" ? describe : describe.skip
const temporaryDirectories: string[] = []

afterAll(async () => {
  await Promise.all(
    temporaryDirectories.map(directory => rm(directory, { recursive: true, force: true })),
  )
})

function hash(content: string): string {
  return createHash("sha256").update(content).digest("hex")
}

live("onchain archive verification (live)", () => {
  it("matches a freshly observed known Tezos token through public infrastructure", async () => {
    const client = createWhitehashClient({
      resolver: { ipfsGateways: ["https://ipfs.io"], onchfs: null },
    })
    const ref = {
      chain: "tezos:mainnet" as const,
      contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
      tokenId: "16333",
    }
    const token = await client.getToken(ref)
    expect(token).not.toBeNull()
    if (!token) return

    const root = await mkdtemp(join(tmpdir(), "whitehash-live-verify-"))
    temporaryDirectories.push(root)
    const path = `${ref.chain}/${ref.contract}/${ref.tokenId}`
    const tokenDir = join(root, path)
    await mkdir(join(tokenDir, "artifact"), { recursive: true })
    const artifact = "<!doctype html><title>live verification fixture</title>\n"
    const metadata = "{}\n"
    const wrapper =
      '<!doctype html><iframe src="./artifact/index.html" sandbox="allow-scripts"></iframe>\n'
    const provenance = {
      format: 1 as const,
      observedAt: new Date().toISOString(),
      state: {
        iterationHash: token.iterationHash,
        artifactUri: token.artifactUri,
        generatorUri: token.generatorUri,
        metadataUri: token.metadataUri,
        assigned: token.assigned,
      },
    }
    const provenanceJson = `${JSON.stringify(provenance, null, 2)}\n`
    await writeFile(join(root, "index.html"), "<!doctype html><title>archive</title>\n")
    await writeFile(join(tokenDir, "artifact", "index.html"), artifact)
    await writeFile(join(tokenDir, "metadata.json"), metadata)
    await writeFile(join(tokenDir, "provenance.json"), provenanceJson)
    await writeFile(join(tokenDir, "index.html"), wrapper)
    await writeFile(
      join(tokenDir, "integrity.json"),
      `${JSON.stringify(
        {
          "artifact/index.html": hash(artifact),
          "index.html": hash(wrapper),
          "metadata.json": hash(metadata),
          "provenance.json": hash(provenanceJson),
        },
        null,
        2,
      )}\n`,
    )
    const manifest: ArchiveManifest = {
      format: 1,
      createdAt: new Date().toISOString(),
      addresses: [],
      tokens: [
        {
          ...ref,
          name: token.name,
          path,
          artifact: "ipfs",
          files: 1,
          provenance,
        },
      ],
    }
    await writeFile(join(root, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`)

    await expect(verifyArchiveOnchain(root, { client })).resolves.toMatchObject({
      status: "match",
      tokens: [{ status: "match" }],
    })
  })
})
