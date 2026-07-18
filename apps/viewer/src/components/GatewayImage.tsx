import { useEffect, useMemo, useState } from "react"
import { resolveUriAll, type ResolverConfig } from "@whitehash/resolve"
import { cn } from "@whitehash/ui"

/**
 * An <img> that falls back across every configured IPFS gateway. A single
 * gateway often can't serve a given CID (DHT miss, rate-limit, timeout) even
 * though the content is pinned elsewhere — on error we advance to the next
 * gateway URL, mirroring the metadata-fetch fallback. Shows the placeholder
 * only once every gateway has failed.
 */
export function GatewayImage({
  uri,
  chain,
  resolver,
  alt = "",
  className,
  lazy = false,
}: {
  uri: string | null
  chain: string
  resolver: ResolverConfig
  alt?: string
  className?: string
  lazy?: boolean
}) {
  // Key on config *content*, not the resolver object identity — parents
  // recreate the resolver object every render, which would otherwise reset the
  // fallback index mid-loading and pin us to a failing gateway.
  const configKey = `${resolver.ipfsGateways.join(",")}|${resolver.onchfsProxy ?? ""}`
  const urls = useMemo(
    () => (uri ? resolveUriAll(uri, resolver, { chain }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uri, chain, configKey],
  )
  const [idx, setIdx] = useState(0)

  // Reset to the first gateway only when the source or config actually changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setIdx(0), [uri, chain, configKey])

  const src = urls[idx]
  if (!src) return <div className={cn("hatch size-full", className)} />

  return (
    <img
      src={src}
      alt={alt}
      className={cn("block size-full object-cover", className)}
      loading={lazy ? "lazy" : undefined}
      onError={() => setIdx(i => i + 1)}
    />
  )
}
