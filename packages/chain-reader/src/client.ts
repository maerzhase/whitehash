import {
  createResolver,
  type FetchFallbackOptions,
  type ResolveOptions,
} from "@whitehash/resolve"
import {
  getEvmProjectInfo,
  getEvmProjectPreview,
  getTezosProject,
  listEvmProjectTokens,
  listProjects,
  listTezosProjectTokens,
  type ListOrder,
} from "./browse.js"
import { isEvmChain, isTezosChain } from "./networks.js"
import {
  artworkUrl,
  imageUrl,
  liveViewStatus,
  type LiveViewStatus,
} from "./semantics.js"
import type { ProjectRef, TokenRef } from "./refs.js"
import { getToken } from "./token.js"
import type {
  ChainId,
  ChainReaderConfig,
  NetworkMode,
  ProgressCallback,
  WhitehashToken,
} from "./types.js"
import { getWalletTokens } from "./wallet.js"

export interface ListProjectsOptions {
  chain: ChainId
  version?: string
  cursor?: string | null
  limit?: number
  order?: ListOrder
}

export interface ListProjectTokensOptions {
  cursor?: string | null
  limit?: number
  order?: ListOrder
}

export interface GetWalletTokensOptions {
  chains?: ChainId[]
  mode?: NetworkMode
  onProgress?: ProgressCallback
}

function addressChains(address: string, mode: NetworkMode): ChainId[] {
  if (/^(tz[1-4]|KT1)/.test(address)) return [mode === "mainnet" ? "tezos:mainnet" : "tezos:ghostnet"]
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return mode === "mainnet" ? ["eip155:1", "eip155:8453"] : ["eip155:11155111", "eip155:84532"]
  }
  return []
}

/** A framework-free whitehash API with configuration bound once. */
export function createWhitehashClient(config: ChainReaderConfig) {
  const resolver = createResolver(config.resolver)

  return {
    config,
    resolver,
    resolveUri: (uri: string, options?: ResolveOptions) =>
      resolver.resolveUri(uri, options),
    resolveUriAll: (uri: string, options?: ResolveOptions) =>
      resolver.resolveUriAll(uri, options),
    fetchUri: (uri: string, options?: FetchFallbackOptions) =>
      resolver.fetch(uri, options),
    getWalletTokens: (
      address: string,
      options: GetWalletTokensOptions = {},
    ) => getWalletTokens(
      address,
      options.chains ?? addressChains(address, options.mode ?? "mainnet"),
      config,
      options.onProgress,
    ),
    listProjects: (
      options: ListProjectsOptions,
      onProgress?: ProgressCallback,
    ) => listProjects(options.chain, config, {
      issuerVersion: options.version,
      cursor: options.cursor,
      limit: options.limit,
      order: options.order,
    }, onProgress),
    getProject: async (ref: ProjectRef) => {
      const { chain } = ref
      if (isTezosChain(chain)) return getTezosProject(chain, ref.id, config)
      if (!isEvmChain(chain)) return null
      const info = await getEvmProjectInfo(chain, ref.id, config)
      const preview = await getEvmProjectPreview(chain, ref.id, config)
      return {
        chain,
        ref,
        name: info.name ?? null,
        description: null,
        displayUri: preview,
        thumbnailUri: preview,
        editions: null,
        minted: info.minted ?? null,
        raw: info,
      }
    },
    getToken: (ref: TokenRef) => getToken(ref, config),
    listProjectTokens: async (
      ref: ProjectRef,
      options: ListProjectTokensOptions = {},
    ) => {
      const { chain } = ref
      if (isTezosChain(chain)) {
        const project = await getTezosProject(chain, ref.id, config)
        if (!project?.name) return { tokens: [], cursor: null }
        return listTezosProjectTokens(chain, project.name, config, options)
      }
      if (isEvmChain(chain)) {
        return listEvmProjectTokens(chain, ref.id, config, { cursor: options.cursor })
      }
      return Promise.resolve({ tokens: [], cursor: null })
    },
    artworkUrl: (token: WhitehashToken) => artworkUrl(token, config.resolver),
    imageUrl: (
      token: WhitehashToken,
      prefer?: "display" | "thumbnail",
    ) => imageUrl(token, config.resolver, prefer),
    liveViewStatus: (token: WhitehashToken): LiveViewStatus =>
      liveViewStatus(token, config.resolver),
  }
}

export type WhitehashClient = ReturnType<typeof createWhitehashClient>
