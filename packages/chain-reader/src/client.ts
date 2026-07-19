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
  type WhitehashProject,
} from "./browse.js"
import { isEvmChain, isTezosChain } from "./networks.js"
import {
  artworkUrl,
  imageUrl,
  liveViewStatus,
  type LiveViewStatus,
} from "./semantics.js"
import type {
  ChainId,
  ChainReaderConfig,
  ProgressCallback,
  WhitehashToken,
} from "./types.js"
import { getChainWalletTokens, getWalletTokens } from "./wallet.js"

export interface ListProjectsOptions {
  issuerVersion?: string
  cursor?: string | null
  limit?: number
  order?: ListOrder
}

export interface ListProjectTokensOptions {
  cursor?: string | null
  limit?: number
  order?: ListOrder
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
      chains: ChainId[],
      onProgress?: ProgressCallback,
    ) => getWalletTokens(address, chains, config, onProgress),
    getChainWalletTokens: (
      address: string,
      chain: ChainId,
      onProgress?: ProgressCallback,
    ) => getChainWalletTokens(address, chain, config, onProgress),
    listProjects: (
      chain: ChainId,
      options?: ListProjectsOptions,
      onProgress?: ProgressCallback,
    ) => listProjects(chain, config, options, onProgress),
    getProject: async (chain: ChainId, ref: string) => {
      if (isTezosChain(chain)) return getTezosProject(chain, ref, config)
      if (!isEvmChain(chain)) return null
      const info = await getEvmProjectInfo(chain, ref, config)
      const preview = await getEvmProjectPreview(chain, ref, config)
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
    getEvmProjectInfo: (
      chain: ChainId,
      contract: string,
    ): Promise<Partial<WhitehashProject>> => {
      if (!isEvmChain(chain)) return Promise.resolve({})
      return getEvmProjectInfo(chain, contract, config)
    },
    getEvmProjectPreview: (
      chain: ChainId,
      contract: string,
    ): Promise<string | null> => {
      if (!isEvmChain(chain)) return Promise.resolve(null)
      return getEvmProjectPreview(chain, contract, config)
    },
    listProjectTokens: (
      chain: ChainId,
      ref: string,
      options: ListProjectTokensOptions & { projectName?: string } = {},
    ) => {
      if (isTezosChain(chain)) {
        if (!options.projectName) {
          throw new Error("A Tezos projectName is required to list iterations")
        }
        return listTezosProjectTokens(chain, options.projectName, config, options)
      }
      if (isEvmChain(chain)) {
        return listEvmProjectTokens(chain, ref, config, { cursor: options.cursor })
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
