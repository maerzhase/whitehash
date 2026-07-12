import { useState } from "react"
import type { WhitehashToken } from "@whitehash/chain-reader"
import type { ResolverConfig } from "@whitehash/resolve"
import { artworkUrl, imageUrl, liveViewStatus } from "../render.js"

// Sandbox + allow values match fxhash's ArtworkIframe so generative pieces that
// use motion sensors / audio behave the same.
const SANDBOX = "allow-scripts allow-same-origin allow-modals"
const ALLOW =
  "accelerometer; camera; gyroscope; microphone; xr-spatial-tracking; fullscreen"

export function ArtworkFrame({
  token,
  resolver,
}: {
  token: WhitehashToken
  resolver: ResolverConfig
}) {
  const [playing, setPlaying] = useState(false)
  const live = artworkUrl(token, resolver)
  const still = imageUrl(token, resolver, "display")
  const status = liveViewStatus(token, resolver)

  if (playing && live) {
    return (
      <div className="artwork">
        <iframe
          title={token.name ?? "artwork"}
          src={live}
          sandbox={SANDBOX}
          allow={ALLOW}
          className="artwork-iframe"
        />
        <button className="overlay-btn" onClick={() => setPlaying(false)}>
          ◼ Stop
        </button>
      </div>
    )
  }

  return (
    <div className="artwork">
      {still ? <img src={still} alt={token.name ?? ""} /> : <div className="noimg" />}
      {status.kind === "ok" ? (
        <button className="overlay-btn play" onClick={() => setPlaying(true)}>
          ▶ Run live
        </button>
      ) : status.kind === "unrevealed" ? (
        <div className="badge">Not yet revealed</div>
      ) : status.kind === "needs-onchfs-proxy" ? (
        <a className="badge link-badge" href="#/settings" title="This artwork is stored on onchfs">
          Stored on onchfs — set a proxy in Settings ↗
        </a>
      ) : (
        <div className="badge">No live view available</div>
      )}
    </div>
  )
}
