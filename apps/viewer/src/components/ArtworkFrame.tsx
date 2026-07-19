import { imageSourceUri, type WhitehashToken } from "@whitehash/chain-reader"
import { useArtworkFrame } from "@whitehash/react"
import { Badge, Button } from "@whitehash/ui"
import { GatewayImage } from "./GatewayImage.js"

const FRAME = "relative aspect-square overflow-hidden rounded-card border border-line bg-surface"

export function ArtworkFrame({
  token,
}: {
  token: WhitehashToken
}) {
  const { status, playing, play, stop, iframeProps } = useArtworkFrame(token)
  const stillUri = imageSourceUri(token, "display")

  if (playing && iframeProps.src) {
    return (
      <div className={FRAME}>
        <iframe
          {...iframeProps}
          className="block size-full border-0"
        />
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-3 left-3 bg-black/70"
          onClick={stop}
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
        alt={token.name ?? ""}
        className="object-contain"
      />
      {status.kind === "ok" ? (
        <Button
          size="sm"
          className="absolute bottom-3 left-3"
          onClick={play}
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
