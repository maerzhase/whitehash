import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import {
  createWhitehashClient,
  type ChainReaderConfig,
  type NetworkMode,
  type WhitehashClient,
} from "@whitehash/chain-reader"
import {
  createDefaultCache,
  type WhitehashCache,
} from "./cache.js"

export interface WhitehashProviderConfig extends ChainReaderConfig {
  /** Address lookups query the mainnet set unless changed here. */
  mode?: NetworkMode
}

export interface WhitehashContextValue {
  client: WhitehashClient
  cache: WhitehashCache
  mode: NetworkMode
}

const WhitehashContext = createContext<WhitehashContextValue | null>(null)

export function WhitehashProvider({
  config,
  cache,
  client: clientOverride,
  children,
}: {
  config: WhitehashProviderConfig
  cache?: WhitehashCache
  /** Advanced override for tests or custom client instrumentation. */
  client?: WhitehashClient
  children: ReactNode
}) {
  const { mode = "mainnet", ...chainReaderConfig } = config
  const client = useMemo(
    () => clientOverride ?? createWhitehashClient(chainReaderConfig),
    [clientOverride, config],
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
