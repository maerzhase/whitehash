import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react"
import {
  imageSourceUri,
  type LiveViewStatus,
  type WhitehashToken,
} from "@whitehash/chain-reader"
import { useArtworkFrame, useGatewayImage } from "@whitehash/react"
import { Badge, type BadgeProps } from "./badge.js"
import { Button, type ButtonProps } from "./button.js"
import { cn } from "../lib/cn.js"

interface ArtworkContextValue {
  token: WhitehashToken
  status: LiveViewStatus
  playing: boolean
  play: () => void
  stop: () => void
  iframeProps: ReturnType<typeof useArtworkFrame>["iframeProps"]
}

const ArtworkContext = createContext<ArtworkContextValue | null>(null)

function useArtworkContext(): ArtworkContextValue {
  const value = useContext(ArtworkContext)
  if (!value) throw new Error("Artwork parts must be rendered inside Artwork.Root")
  return value
}

export interface ArtworkRootProps extends ComponentProps<"div"> {
  token: WhitehashToken
}

function Root({ token, className, children, ...props }: ArtworkRootProps) {
  const frame = useArtworkFrame(token)
  return (
    <ArtworkContext.Provider value={{ token, ...frame }}>
      <div
        className={cn(
          "relative aspect-square overflow-hidden rounded-card border border-line bg-surface",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </ArtworkContext.Provider>
  )
}

export interface ArtworkImageProps
  extends Omit<ComponentProps<"img">, "src" | "onError"> {
  source?: "display" | "thumbnail"
  /** Override the token-derived image with another protocol-native URI. */
  uri?: string | null
  fallback?: ReactNode
}

function Image({
  source = "display",
  uri,
  fallback,
  alt,
  className,
  ...props
}: ArtworkImageProps) {
  const { token, playing } = useArtworkContext()
  const sourceUri = uri === undefined ? imageSourceUri(token, source) : uri
  const image = useGatewayImage(sourceUri, token.chain)
  if (playing) return null
  if (image.failed || !image.src) {
    return fallback ?? <div className={cn("hatch size-full", className)} aria-hidden />
  }
  return (
    <img
      src={image.src}
      onError={image.onError}
      alt={alt ?? token.name ?? ""}
      className={cn("block size-full object-contain", className)}
      {...props}
    />
  )
}

function Live({
  className,
  ...props
}: Omit<ComponentProps<"iframe">, "src" | "sandbox" | "allow">) {
  const { playing, iframeProps } = useArtworkContext()
  if (!playing || !iframeProps.src) return null
  return (
    <iframe
      className={cn("block size-full border-0", className)}
      {...props}
      {...iframeProps}
    />
  )
}

export interface ArtworkPlayButtonProps extends Omit<ButtonProps, "onClick"> {
  playLabel?: ReactNode
  stopLabel?: ReactNode
}

function PlayButton({
  playLabel = "▶ Run live",
  stopLabel = "◼ Stop",
  children,
  variant,
  size = "sm",
  className,
  ...props
}: ArtworkPlayButtonProps) {
  const { status, playing, play, stop } = useArtworkContext()
  if (status.kind !== "ok") return null
  return (
    <Button
      variant={variant ?? (playing ? "secondary" : "primary")}
      size={size}
      className={cn("absolute bottom-3 left-3", playing && "bg-black/70", className)}
      onClick={playing ? stop : play}
      {...props}
    >
      {children ?? (playing ? stopLabel : playLabel)}
    </Button>
  )
}

const STATUS_COPY: Record<Exclude<LiveViewStatus["kind"], "ok">, string> = {
  unrevealed: "Not yet revealed",
  "needs-onchfs-proxy": "Stored on onchfs — configure a proxy",
  unavailable: "No live view available",
}

function StatusBadge({ className, children, variant, ...props }: BadgeProps) {
  const { status, playing } = useArtworkContext()
  if (playing || status.kind === "ok") return null
  return (
    <Badge
      variant={variant ?? (status.kind === "needs-onchfs-proxy" ? "accent" : "warning")}
      className={cn("absolute bottom-3 left-3 bg-black/70", className)}
      {...props}
    >
      {children ?? STATUS_COPY[status.kind]}
    </Badge>
  )
}

export const Artwork = { Root, Image, Live, PlayButton, StatusBadge }
