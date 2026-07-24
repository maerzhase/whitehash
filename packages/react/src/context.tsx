import { createContext, useContext, useMemo, type ReactNode } from "react"
import {
  createWhitehashClient,
  DEFAULT_NETWORK_MODE,
  defaultChainReaderConfig,
  type ChainReaderConfig,
  type NetworkMode,
  type WhitehashClient,
} from "@whitehash/chain-reader"
import { createDefaultCache, type WhitehashCache } from "./cache.js"

export interface WhitehashProviderConfig extends Omit<ChainReaderConfig, "resolver"> {
  /** URI resolution defaults to ipfs.io then dweb.link; onchfs is opt-in. */
  resolver?: Partial<ChainReaderConfig["resolver"]>
  /** Address lookups query the mainnet set unless changed here. */
  mode?: NetworkMode
}

export interface WhitehashContextValue {
  client: WhitehashClient
  cache: WhitehashCache
  mode: NetworkMode
}

const WhitehashContext = createContext<WhitehashContextValue | null>(null)
const DEFAULT_PROVIDER_CONFIG: WhitehashProviderConfig = {}

export function WhitehashProvider({
  config = DEFAULT_PROVIDER_CONFIG,
  cache,
  client: clientOverride,
  children,
}: {
  config?: WhitehashProviderConfig
  cache?: WhitehashCache
  /** Advanced override for tests or custom client instrumentation. */
  client?: WhitehashClient
  children: ReactNode
}) {
  const defaults = useMemo(defaultChainReaderConfig, [])
  const { mode = DEFAULT_NETWORK_MODE, resolver: resolverOverrides } = config
  const resolver = useMemo(
    () => ({ ...defaults.resolver, ...resolverOverrides }),
    [defaults, resolverOverrides],
  )
  const chainReaderConfig = useMemo(() => {
    const { mode: _mode, ...readerConfig } = config
    return { ...defaults, ...readerConfig, resolver }
  }, [config, defaults, resolver])
  const client = useMemo(
    () => clientOverride ?? createWhitehashClient(chainReaderConfig),
    [chainReaderConfig, clientOverride],
  )
  const resolvedCache = useMemo(() => cache ?? createDefaultCache(), [cache])
  const value = useMemo(
    () => ({ client, cache: resolvedCache, mode }),
    [client, resolvedCache, mode],
  )
  return <WhitehashContext.Provider value={value}>{children}</WhitehashContext.Provider>
}

export function useWhitehash(): WhitehashContextValue {
  const value = useContext(WhitehashContext)
  if (!value) {
    throw new Error("@whitehash/react hooks must be used inside WhitehashProvider")
  }
  return value
}
