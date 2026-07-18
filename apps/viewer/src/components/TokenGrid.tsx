import type { WhitehashToken } from "@whitehash/chain-reader"
import type { ResolverConfig } from "@whitehash/resolve"
import { Badge, Button, Card } from "@whitehash/ui"
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
    <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
      {tokens.map(token => (
        <Button key={tokenKey(token)} variant="card" onClick={() => onOpen(token)}>
          <Card.Media className="p-5">
            <GatewayImage
              uri={imageSourceUri(token, "thumbnail")}
              chain={token.chain}
              resolver={resolver}
              alt={token.name ?? ""}
              lazy
            />
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
