import { useMemo, useState } from "react"
import type { MarketEvent } from "@whitehash/market"
import { formatPrice, shortAddress, type ChainCurrency } from "../lib/format.js"

const PAGE = 50

const KIND_LABELS: Record<MarketEvent["kind"], string> = {
  listing: "Listing",
  listing_cancel: "Listing cancelled",
  listing_accept: "Sale (listing)",
  offer: "Offer",
  offer_cancel: "Offer cancelled",
  offer_accept: "Sale (offer)",
  collection_offer: "Collection offer",
  collection_offer_cancel: "Collection offer cancelled",
  collection_offer_accept: "Sale (collection offer)",
  auction: "Auction",
  auction_bid: "Auction bid",
  auction_cancel: "Auction cancelled",
  auction_fulfill: "Sale (auction)",
  mint: "Mint",
  sale: "Sale",
}

export function EventsTable({
  events,
  currency,
}: {
  events: MarketEvent[]
  currency: ChainCurrency
}) {
  const [limit, setLimit] = useState(PAGE)
  const newestFirst = useMemo(() => [...events].reverse(), [events])
  const visible = newestFirst.slice(0, limit)
  return (
    <section>
      <h2>
        Events <span className="muted">({events.length})</span>
      </h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Event</th>
              <th>Token</th>
              <th className="num">Price</th>
              <th>From</th>
              <th>To</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(event => (
              <tr key={`${event.sourceId}/${event.kind}`}>
                <td className="mono">{event.timestamp.slice(0, 10)}</td>
                <td>
                  {KIND_LABELS[event.kind]}
                  {event.saleKind === "primary" && <span className="badge">primary</span>}
                </td>
                <td className="mono">{event.tokenId === null ? "—" : `#${event.tokenId}`}</td>
                <td className="num mono">{formatPrice(event.price, currency)}</td>
                <td className="mono">{shortAddress(event.seller)}</td>
                <td className="mono">{shortAddress(event.buyer)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {limit < events.length && (
        <button type="button" className="ghost" onClick={() => setLimit(limit + PAGE)}>
          Show {Math.min(PAGE, events.length - limit)} more
        </button>
      )}
    </section>
  )
}
