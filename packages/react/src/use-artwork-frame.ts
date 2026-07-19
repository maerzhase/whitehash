import { useCallback, useEffect, useMemo, useState } from "react"
import {
  tokenKey,
  type LiveViewStatus,
  type WhitehashClient,
  type WhitehashToken,
} from "@whitehash/chain-reader"
import { useWhitehash } from "./context.js"

export const ARTWORK_IFRAME_SANDBOX = "allow-scripts allow-same-origin allow-modals"
export const ARTWORK_IFRAME_ALLOW =
  "accelerometer; camera; gyroscope; microphone; xr-spatial-tracking; fullscreen"

export interface ArtworkIframeProps {
  title: string
  src: string | undefined
  sandbox: string
  allow: string
}

/** Own the play state and security attributes for a live artwork iframe. */
export function useArtworkFrame(
  token: WhitehashToken,
  options: { client?: WhitehashClient } = {},
): {
  status: LiveViewStatus
  playing: boolean
  play: () => void
  stop: () => void
  iframeProps: ArtworkIframeProps
} {
  const context = useWhitehash()
  const client = options.client ?? context.client
  const status = client.liveViewStatus(token)
  const [playing, setPlaying] = useState(false)
  const identity = tokenKey(token)

  useEffect(() => setPlaying(false), [identity, status.kind])
  const play = useCallback(() => {
    if (status.kind === "ok") setPlaying(true)
  }, [status.kind])
  const stop = useCallback(() => setPlaying(false), [])
  const iframeProps = useMemo<ArtworkIframeProps>(() => ({
    title: token.name ?? "artwork",
    src: status.kind === "ok" ? status.url : undefined,
    sandbox: ARTWORK_IFRAME_SANDBOX,
    allow: ARTWORK_IFRAME_ALLOW,
  }), [status, token.name])

  return { status, playing, play, stop, iframeProps }
}
