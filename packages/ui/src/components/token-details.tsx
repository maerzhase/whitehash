import type { ComponentProps, ReactNode } from "react"
import type { WhitehashToken } from "@whitehash/chain-reader"
import { useWhitehash } from "@whitehash/react"
import { Artwork } from "./artwork.js"
import { Button } from "./button.js"
import { cn } from "../lib/cn.js"

function Row({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={mono ? "truncate font-mono text-[13px]" : "truncate text-sm"}>{children}</dd>
    </>
  )
}

export interface TokenDetailsProps extends ComponentProps<"article"> {
  token: WhitehashToken
  onBack?: () => void
  settingsHref?: string
}

export function TokenDetails({
  token,
  onBack,
  settingsHref,
  className,
  ...props
}: TokenDetailsProps) {
  const { client } = useWhitehash()
  const live = client.artworkUrl(token)
  const needsOnchfs = client.liveViewStatus(token).kind === "needs-onchfs"
  return (
    <article className={cn("pt-5", className)} {...props}>
      {onBack ? (
        <Button variant="link" onClick={onBack}>
          ← Back
        </Button>
      ) : null}
      <div className="mt-5 grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <Artwork.Root token={token}>
          <Artwork.Image />
          <Artwork.Live />
          <Artwork.PlayButton />
          {needsOnchfs && settingsHref ? (
            <a href={settingsHref} title="Stored on onchfs">
              <Artwork.StatusBadge />
            </a>
          ) : (
            <Artwork.StatusBadge />
          )}
        </Artwork.Root>
        <div>
          <h2 className="mb-3 font-display text-3xl font-semibold leading-10 tracking-[-0.04em]">
            {token.name ?? `#${token.tokenId}`}
          </h2>
          {token.description ? (
            <p className="text-sm leading-relaxed text-muted">{token.description}</p>
          ) : null}
          <dl className="my-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            <Row label="Chain">{token.chain}</Row>
            <Row label="Contract" mono>
              {token.contract}
            </Row>
            <Row label="Token ID" mono>
              {token.tokenId}
            </Row>
            {token.iterationHash ? (
              <Row label="Hash" mono>
                {token.iterationHash}
              </Row>
            ) : null}
            <Row label="Revealed">{token.assigned ? "yes" : "no (placeholder)"}</Row>
          </dl>
          {token.attributes.length > 0 ? (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold">Features</h3>
              <ul className="flex flex-col gap-1">
                {token.attributes.map(attribute => (
                  <li key={attribute.name} className="text-sm">
                    <span className="text-muted">{attribute.name}</span> {attribute.value}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {live ? (
            <Button
              variant="link"
              render={<a href={live} target="_blank" rel="noreferrer" />}
              className="mt-4 inline-block"
            >
              Open Artwork ↗
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
