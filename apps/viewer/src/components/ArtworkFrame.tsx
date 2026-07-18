import { useState } from "react"
import type { WhitehashToken } from "@whitehash/chain-reader"
import type { ResolverConfig } from "@whitehash/resolve"
import { Badge, Button } from "@whitehash/ui"
import { artworkUrl, imageSourceUri, liveViewStatus } from "../render.js"
import { GatewayImage } from "./GatewayImage.js"

// Sandbox + allow values match fxhash's ArtworkIframe so generative pieces that
// use motion sensors / audio behave the same.
const SANDBOX = "allow-scripts allow-same-origin allow-modals"
const ALLOW =
  "accelerometer; camera; gyroscope; microphone; xr-spatial-tracking; fullscreen"

const FRAME = "relative aspect-square overflow-hidden rounded-card border border-line bg-surface"

export function ArtworkFrame({
  token,
  resolver,
}: {
  token: WhitehashToken
  resolver: ResolverConfig
}) {
  const [playing, setPlaying] = useState(false)
  const live = artworkUrl(token, resolver)
  const stillUri = imageSourceUri(token, "display")
  const status = liveViewStatus(token, resolver)

  if (playing && live) {
    return (
      <div className={FRAME}>
        <iframe
          title={token.name ?? "artwork"}
          src={live}
          sandbox={SANDBOX}
          allow={ALLOW}
          className="block size-full border-0"
        />
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-3 left-3 bg-black/70"
          onClick={() => setPlaying(false)}
        >
          ◼ Stop
        </Button>
      </div>
    )
  }

  return (
    <div className={FRAME}>
      <GatewayImage
        uri={stillUri}
        chain={token.chain}
        resolver={resolver}
        alt={token.name ?? ""}
        className="object-contain"
      />
      {status.kind === "ok" ? (
        <Button
          size="sm"
          className="absolute bottom-3 left-3"
          onClick={() => setPlaying(true)}
        >
          ▶ Run live
        </Button>
      ) : status.kind === "unrevealed" ? (
        <Badge variant="warning" className="absolute bottom-3 left-3 bg-black/70">
          Not yet revealed
        </Badge>
      ) : status.kind === "needs-onchfs-proxy" ? (
        <a href="#/settings" className="absolute bottom-3 left-3" title="Stored on onchfs">
          <Badge variant="accent" className="bg-black/70">
            Stored on onchfs — set a proxy in Settings ↗
          </Badge>
        </a>
      ) : (
        <Badge variant="warning" className="absolute bottom-3 left-3 bg-black/70">
          No live view available
        </Badge>
      )}
    </div>
  )
}
