import type { ChainId } from "@whitehash/chain-reader"
import { useGatewayImage } from "@whitehash/react"
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
  alt = "",
  className,
  lazy = false,
}: {
  uri: string | null
  chain: ChainId
  alt?: string
  className?: string
  lazy?: boolean
}) {
  const { src, onError, failed } = useGatewayImage(uri, chain)
  if (failed || !src) return <div className={cn("hatch size-full", className)} />

  return (
    <img
      src={src}
      alt={alt}
      // Contain (never crop) so the whole artwork is visible inside its square.
      className={cn("block size-full object-contain", className)}
      loading={lazy ? "lazy" : undefined}
      onError={onError}
    />
  )
}
