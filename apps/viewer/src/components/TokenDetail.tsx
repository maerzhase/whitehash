import type { WhitehashToken } from "@whitehash/chain-reader"
import type { ResolverConfig } from "@whitehash/resolve"
import { artworkUrl } from "../render.js"
import { ArtworkFrame } from "./ArtworkFrame.js"

export function TokenDetail({
  token,
  resolver,
  onBack,
}: {
  token: WhitehashToken
  resolver: ResolverConfig
  onBack: () => void
}) {
  const live = artworkUrl(token, resolver)
  return (
    <div className="detail">
      <button className="link" onClick={onBack}>
        ← back
      </button>
      <div className="detail-body">
        <ArtworkFrame token={token} resolver={resolver} />
        <div className="detail-info">
          <h2>{token.name ?? `#${token.tokenId}`}</h2>
          {token.description ? <p className="muted">{token.description}</p> : null}
          <dl>
            <dt>Chain</dt>
            <dd>{token.chain}</dd>
            <dt>Contract</dt>
            <dd className="mono">{token.contract}</dd>
            <dt>Token ID</dt>
            <dd className="mono">{token.tokenId}</dd>
            {token.iterationHash ? (
              <>
                <dt>Hash</dt>
                <dd className="mono ellipsis">{token.iterationHash}</dd>
              </>
            ) : null}
            <dt>Revealed</dt>
            <dd>{token.assigned ? "yes" : "no (placeholder)"}</dd>
          </dl>
          {token.attributes.length > 0 ? (
            <div className="attrs">
              <h3>Features</h3>
              <ul>
                {token.attributes.map(a => (
                  <li key={a.name}>
                    <span className="muted">{a.name}</span> {a.value}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {live ? (
            <a className="link" href={live} target="_blank" rel="noreferrer">
              open artwork in new tab ↗
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}
