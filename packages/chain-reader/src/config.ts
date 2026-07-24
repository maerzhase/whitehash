import { defaultResolverConfig } from "@whitehash/resolve"
import type { ChainReaderConfig, NetworkMode } from "./types.js"

/** Network family used by address-based reads when no mode is supplied. */
export const DEFAULT_NETWORK_MODE: NetworkMode = "mainnet"

/** Public, copy-safe defaults used by the framework-free client and React provider. */
export function defaultChainReaderConfig(): ChainReaderConfig {
  return { resolver: defaultResolverConfig() }
}
