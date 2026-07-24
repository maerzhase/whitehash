import type { ProjectRef } from "./refs.js"

/** How the reusable generator is stored for a curated project example. */
export type ExampleGeneratorStorage = "ipfs" | "onchfs"

/**
 * Where the project's metadata document is currently read from.
 *
 * `platform-with-ipfs-backup` identifies the EVM base-URI edge case: the
 * contract points at platform-hosted metadata, while that document advertises
 * an immutable `ipfsBackupUri` for the generator.
 */
export type ExampleMetadataStorage = "ipfs" | "platform-with-ipfs-backup"

export type ExampleCaptureMode = "canvas" | "viewport" | "gif"
export type ExampleProjectKind = "tezos-issuer-v2" | "evm-fixed-editions" | "evm-open-form"

/** A real mainnet project selected to exercise a distinct rendering path. */
export interface CuratedProjectExample {
  /** The stable part of the public project URL; informational, not a load key. */
  slug: string
  name: string
  /** Pass directly to `useProject`, `client.getProject`, or `ProjectGallery`. */
  ref: ProjectRef
  kind: ExampleProjectKind
  generatorStorage: ExampleGeneratorStorage
  metadataStorage: ExampleMetadataStorage
  captureMode: ExampleCaptureMode
  /** Searchable behaviors that make this project useful as a fixture/demo. */
  covers: readonly string[]
}

/**
 * Curated real-world project inputs for demos, integration tests, and visual QA.
 *
 * These contain identity and classification only. Hooks still read the current
 * project and token metadata from chain/public infrastructure, so copied
 * previews, token IDs, supply counts, and mutable marketplace data cannot go
 * stale here.
 */
export const CURATED_PROJECT_EXAMPLES = [
  {
    slug: "monogrid-1.1-ce",
    name: "monogrid 1.1 CE",
    ref: { type: "project", chain: "tezos:mainnet", id: "v2:13944" },
    kind: "tezos-issuer-v2",
    generatorStorage: "ipfs",
    metadataStorage: "ipfs",
    captureMode: "viewport",
    covers: ["animated", "webgl", "delay-trigger", "legacy-runtime"],
  },
  {
    slug: "(kinder)garden-monuments",
    name: "(kinder)Garden, Monuments",
    ref: { type: "project", chain: "tezos:mainnet", id: "v2:11104" },
    kind: "tezos-issuer-v2",
    generatorStorage: "ipfs",
    metadataStorage: "ipfs",
    captureMode: "canvas",
    covers: ["plottable", "interactive", "function-trigger", "collaboration"],
  },
  {
    slug: "reading-a-book",
    name: "Reading a book",
    ref: { type: "project", chain: "tezos:mainnet", id: "v2:86" },
    kind: "tezos-issuer-v2",
    generatorStorage: "ipfs",
    metadataStorage: "ipfs",
    captureMode: "viewport",
    covers: ["animated", "webgl", "gentk-v1-artifact", "legacy-runtime"],
  },
  {
    slug: "richter",
    name: "Richter",
    ref: { type: "project", chain: "tezos:mainnet", id: "v2:24000" },
    kind: "tezos-issuer-v2",
    generatorStorage: "ipfs",
    metadataStorage: "ipfs",
    captureMode: "viewport",
    covers: ["interactive", "animated", "gpu", "large-assets", "collaboration"],
  },
  {
    slug: "defrag",
    name: "De/Frag",
    ref: { type: "project", chain: "tezos:mainnet", id: "v2:981" },
    kind: "tezos-issuer-v2",
    generatorStorage: "ipfs",
    metadataStorage: "ipfs",
    captureMode: "canvas",
    covers: ["animated", "non-looping", "gentk-v1-artifact", "legacy-runtime"],
  },
  {
    slug: "dragons",
    name: "Dragons",
    ref: { type: "project", chain: "tezos:mainnet", id: "v2:2613" },
    kind: "tezos-issuer-v2",
    generatorStorage: "ipfs",
    metadataStorage: "ipfs",
    captureMode: "viewport",
    covers: ["slow-render", "gentk-v1-artifact", "legacy-runtime", "fixed-editions"],
  },
  {
    slug: "blokkendoos",
    name: "Blokkendoos",
    ref: {
      type: "project",
      chain: "eip155:1",
      id: "0x76e27D6C7B8324fD42Fe21D63DA5195551dc1cc4",
    },
    kind: "evm-fixed-editions",
    generatorStorage: "onchfs",
    metadataStorage: "ipfs",
    captureMode: "canvas",
    covers: ["ethereum", "gpu", "function-trigger", "url-options", "snippet-v4"],
  },
  {
    slug: "entangled-2",
    name: "Entangled",
    ref: {
      type: "project",
      chain: "eip155:1",
      id: "0x19DBc1c820dd3F13260829a4E06Dda6d9EF758DB",
    },
    kind: "evm-fixed-editions",
    generatorStorage: "onchfs",
    metadataStorage: "ipfs",
    captureMode: "viewport",
    covers: ["ethereum", "animated", "cross-chain", "multi-window", "snippet-v4"],
  },
  {
    slug: "impossible-sentinels",
    name: "Impossible Sentinels",
    ref: {
      type: "project",
      chain: "eip155:1",
      id: "0x5e000097583A92c2c17102Aa9d6907cd4bD2fC63",
    },
    kind: "evm-fixed-editions",
    generatorStorage: "onchfs",
    metadataStorage: "platform-with-ipfs-backup",
    captureMode: "viewport",
    covers: ["ethereum", "partially-minted", "plottable", "svg", "url-options"],
  },
  {
    slug: "dom2",
    name: "DOM2",
    ref: {
      type: "project",
      chain: "eip155:8453",
      id: "0x50c04A6B066d659Fe2F66F6388Cf8dD394036632",
    },
    kind: "evm-fixed-editions",
    generatorStorage: "onchfs",
    metadataStorage: "platform-with-ipfs-backup",
    captureMode: "viewport",
    covers: ["base", "audio", "animated", "html-dom", "collaboration"],
  },
  {
    slug: "space-wanderer",
    name: "SPACE WANDERER",
    ref: {
      type: "project",
      chain: "eip155:8453",
      id: "0xF5D8c439B6b305952F1C3125965BC339959226d1",
    },
    kind: "evm-open-form",
    generatorStorage: "ipfs",
    metadataStorage: "ipfs",
    captureMode: "gif",
    covers: ["base", "animated", "perfect-loop", "gif", "artcoin", "open-form"],
  },
] as const satisfies readonly CuratedProjectExample[]

/** Look up a curated example by the slug used in its public project URL. */
export function curatedProjectExample(slug: string): CuratedProjectExample | undefined {
  return CURATED_PROJECT_EXAMPLES.find(example => example.slug === slug)
}
