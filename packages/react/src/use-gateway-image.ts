import { useCallback, useEffect, useMemo, useState } from "react"
import type { ChainId, WhitehashClient } from "@whitehash/chain-reader"
import { useWhitehash } from "./context.js"

export interface UseGatewayImageOptions {
  client?: WhitehashClient
}

/** Resolve an image and advance through configured IPFS gateways on error. */
export function useGatewayImage(
  uri: string | null,
  chain: ChainId,
  options: UseGatewayImageOptions = {},
) {
  const context = useWhitehash()
  const client = options.client ?? context.client
  const configKey = `${client.config.resolver.ipfsGateways.join(",")}|${client.config.resolver.onchfsProxy ?? ""}`
  const urls = useMemo(
    () => uri ? client.resolveUriAll(uri, { chain }) : [],
    [chain, client, configKey, uri],
  )
  const [index, setIndex] = useState(0)

  useEffect(() => setIndex(0), [chain, configKey, uri])

  const onError = useCallback(() => setIndex(value => value + 1), [])
  return {
    src: urls[index],
    onError,
    failed: urls.length === 0 || index >= urls.length,
  }
}
