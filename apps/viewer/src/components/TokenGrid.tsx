import type { WhitehashToken } from "@whitehash/chain-reader"
import type { ResolverConfig } from "@whitehash/resolve"
import { Badge, Button, Card, Skeleton } from "@whitehash/ui"
import { imageSourceUri, tokenKey } from "../render.js"
import { GatewayImage } from "./GatewayImage.js"

function chainLabel(chain: string): string {
  if (chain.startsWith("tezos")) return chain.includes("ghost") ? "Ghostnet" : "Tezos"
  if (chain === "eip155:1") return "Ethereum"
  if (chain === "eip155:8453") return "Base"
  if (chain === "eip155:11155111") return "Sepolia"
  if (chain === "eip155:84532") return "Base Sepolia"
  return chain
}

export function TokenGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6"
      aria-hidden
    >
      {Array.from({ length: count }, (_, index) => (
        <Card.Root key={index} className="shadow-[0_1px_2px_rgba(0,0,0,.16)]">
          <Card.Media className="bg-canvas">
            <Skeleton className="absolute inset-5" />
          </Card.Media>
          <Card.Body>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-16" />
          </Card.Body>
        </Card.Root>
      ))}
    </div>
  )
}

export function TokenGrid({
  tokens,
  resolver,
  onOpen,
}: {
  tokens: WhitehashToken[]
  resolver: ResolverConfig
  onOpen: (token: WhitehashToken) => void
}) {
  if (tokens.length === 0) return null
  return (
    <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
      {tokens.map(token => (
        <Button key={tokenKey(token)} variant="card" onClick={() => onOpen(token)}>
          <Card.Media className="bg-canvas">
            {/* absolute inset gives the image a definite box, so the square is
                always enforced (portrait art letterboxes) with a small matte. */}
            <div className="absolute inset-3">
              <GatewayImage
                uri={imageSourceUri(token, "thumbnail")}
                chain={token.chain}
                resolver={resolver}
                alt={token.name ?? ""}
                lazy
              />
            </div>
            {!token.assigned ? (
              <Badge variant="warning" className="absolute left-2 top-2 bg-black/60">
                unrevealed
              </Badge>
            ) : null}
          </Card.Media>
          <Card.Body>
            <Card.Title>{token.name ?? `#${token.tokenId}`}</Card.Title>
            <Card.Meta>
              <Badge>{chainLabel(token.chain)}</Badge>
            </Card.Meta>
          </Card.Body>
        </Button>
      ))}
    </div>
  )
}
