import type { WhitehashToken } from "@whitehash/chain-reader"
import type { ResolverConfig } from "@whitehash/resolve"
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
    <div className="grid">
      {tokens.map(token => {
        return (
          <button
            key={tokenKey(token)}
            className="card"
            onClick={() => onOpen(token)}
          >
            <div className="card-img">
              <GatewayImage
                uri={imageSourceUri(token, "thumbnail")}
                chain={token.chain}
                resolver={resolver}
                alt={token.name ?? ""}
                lazy
              />
              {!token.assigned ? <span className="chip warn">unrevealed</span> : null}
            </div>
            <div className="card-meta">
              <span className="card-name">{token.name ?? `#${token.tokenId}`}</span>
              <span className="chip">{chainLabel(token.chain)}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
