/**
 * Decoder tests use real TzKT operation payloads captured from mainnet
 * (August 2026), trimmed to the selected fields the backfill requests.
 */
import { describe, expect, it } from "vitest"
import {
  backfillTezosMarketEvents,
  decodeMarketplaceV1Operation,
  decodeMarketplaceV2Operation,
  decodeMintOperation,
  type TzktOperation,
} from "./tezos-backfill.js"

const ctx = { chain: "tezos:mainnet" as const, defaultContract: "KT1default" }

const GENTK_V1 = "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE"
const GENTK_V2 = "KT1U6EHmNxJTkvaWJ4ThczG4FSDaHC21ssvi"

describe("decodeMarketplaceV2Operation", () => {
  it("decodes a listing creation from its big-map diff", () => {
    const op: TzktOperation = {
      id: 194593496760320,
      level: 2285821,
      timestamp: "2022-04-16T12:01:29Z",
      sender: { address: "tz1WwJoFqMXqB9sh74dsRkjoxEim5QkzbC8o" },
      amount: 0,
      parameter: {
        entrypoint: "listing",
        value: { gentk: { id: "431035", version: "0" }, price: "2269000000" },
      },
      diffs: [
        {
          bigmap: 149787,
          path: "listings",
          action: "add_key",
          content: {
            key: "0",
            value: {
              gentk: { id: "431035", version: "0" },
              price: "2269000000",
              seller: "tz1WwJoFqMXqB9sh74dsRkjoxEim5QkzbC8o",
            },
          },
        },
      ],
      hash: "ooQFn4dAF1iGdHfsamXYYm4Fr1GdkchePzanATKonCq6SNHwv5p",
    }
    expect(decodeMarketplaceV2Operation(op, ctx)).toEqual({
      kind: "listing",
      chain: "tezos:mainnet",
      marketplace: "fxhash-tezos-v2",
      contract: GENTK_V1,
      tokenId: "431035",
      orderId: "fxhash-tezos-v2:listing:0",
      price: "2269000000",
      seller: "tz1WwJoFqMXqB9sh74dsRkjoxEim5QkzbC8o",
      buyer: null,
      saleKind: null,
      timestamp: "2022-04-16T12:01:29Z",
      level: 2285821,
      opHash: "ooQFn4dAF1iGdHfsamXYYm4Fr1GdkchePzanATKonCq6SNHwv5p",
      sourceId: "194593496760320",
    })
  })

  it("decodes a listing_accept from the removed value, buyer = sender", () => {
    const op: TzktOperation = {
      id: 194598576062464,
      level: 2285833,
      timestamp: "2022-04-16T12:07:29Z",
      sender: { address: "tz1TWQdEQgZbJLyfcP714zs1zJM4gRuWPqWp" },
      amount: 3000000,
      parameter: { entrypoint: "listing_accept", value: "5" },
      diffs: [
        {
          bigmap: 149787,
          path: "listings",
          action: "remove_key",
          content: {
            key: "5",
            value: {
              gentk: { id: "589217", version: "1" },
              price: "3000000",
              seller: "tz1Lup7XznCYm746dZQScwDgfP8bjYbB1See",
            },
          },
        },
      ],
      hash: "opAccept",
    }
    const event = decodeMarketplaceV2Operation(op, ctx)
    expect(event).toMatchObject({
      kind: "listing_accept",
      contract: GENTK_V2,
      tokenId: "589217",
      orderId: "fxhash-tezos-v2:listing:5",
      price: "3000000",
      seller: "tz1Lup7XznCYm746dZQScwDgfP8bjYbB1See",
      buyer: "tz1TWQdEQgZbJLyfcP714zs1zJM4gRuWPqWp",
      saleKind: "secondary",
    })
  })

  it("decodes a collection_offer_accept: token from params, buyer from value", () => {
    const op: TzktOperation = {
      id: 507032164630528,
      level: 3300000,
      timestamp: "2023-06-01T00:00:00Z",
      sender: { address: "tz1RnJG1MLR2eTSVNXFvZPMd1ck8SNRN2f3w" },
      parameter: {
        entrypoint: "collection_offer_accept",
        value: { gentk: { id: "1296353", version: "1" }, offer_id: "1" },
      },
      diffs: [
        {
          bigmap: 149783,
          path: "collection_offers",
          action: "update_key",
          content: {
            key: "1",
            value: {
              buyer: "tz1ewF2P3erZJSP8m35QiNEKGtwj7qsBhF8z",
              price: "1000000",
              amount: "0",
              collection: "21305",
            },
          },
        },
      ],
      hash: "opCollOffer",
    }
    expect(decodeMarketplaceV2Operation(op, ctx)).toMatchObject({
      kind: "collection_offer_accept",
      contract: GENTK_V2,
      tokenId: "1296353",
      orderId: "fxhash-tezos-v2:collection_offer:1",
      price: "1000000",
      buyer: "tz1ewF2P3erZJSP8m35QiNEKGtwj7qsBhF8z",
      seller: "tz1RnJG1MLR2eTSVNXFvZPMd1ck8SNRN2f3w",
      saleKind: "secondary",
    })
  })

  it("returns null for operations without a relevant diff", () => {
    const op: TzktOperation = {
      id: 1,
      level: 1,
      timestamp: "2022-01-01T00:00:00Z",
      parameter: { entrypoint: "listing", value: {} },
      diffs: [],
      hash: "op",
    }
    expect(decodeMarketplaceV2Operation(op, ctx)).toBe(null)
  })
})

describe("decodeMarketplaceV1Operation", () => {
  it("normalizes a v1 offer to a listing on gentk v1", () => {
    const op: TzktOperation = {
      id: 113435333361664,
      level: 1853411,
      timestamp: "2021-11-20T00:00:00Z",
      parameter: {
        entrypoint: "offer",
        value: {
          price: "50000000",
          creator: "tz1PoDdN2oyRyF6DA73zTWAWYhNL4UGr3Egj",
          objkt_id: "167",
          royalties: "100",
        },
      },
      diffs: [
        {
          bigmap: 22799,
          path: "offers",
          action: "add_key",
          content: {
            key: "0",
            value: {
              price: "50000000",
              issuer: "tz1VhkraxRpBD9R4n12Zz6WFwqLZwoQrGvrT",
              creator: "tz1PoDdN2oyRyF6DA73zTWAWYhNL4UGr3Egj",
              objkt_id: "167",
              royalties: "100",
              objkt_amount: "1",
            },
          },
        },
      ],
      hash: "opV1Offer",
    }
    expect(decodeMarketplaceV1Operation(op, ctx)).toMatchObject({
      kind: "listing",
      marketplace: "fxhash-tezos-v1",
      contract: GENTK_V1,
      tokenId: "167",
      orderId: "fxhash-tezos-v1:listing:0",
      price: "50000000",
      seller: "tz1VhkraxRpBD9R4n12Zz6WFwqLZwoQrGvrT",
    })
  })

  it("decodes a collect (update_key with objkt_amount 0) as listing_accept", () => {
    const op: TzktOperation = {
      id: 113487006138368,
      level: 1853721,
      timestamp: "2021-11-20T01:00:00Z",
      sender: { address: "tz1UXV2pDd8DM3Jicru3o6fZZfHeKnBYbs4H" },
      amount: 10000000,
      parameter: { entrypoint: "collect", value: "2" },
      diffs: [
        {
          bigmap: 22799,
          path: "offers",
          action: "update_key",
          content: {
            key: "2",
            value: {
              price: "10000000",
              issuer: "tz1X1vYvUhXRuedJigE8aFY5ALDnbQPd1MeR",
              creator: "tz1SawhUHXWjiGK8gPK6QPmn95G8PkkSjA3S",
              objkt_id: "363",
              royalties: "100",
              objkt_amount: "0",
            },
          },
        },
      ],
      hash: "opV1Collect",
    }
    expect(decodeMarketplaceV1Operation(op, ctx)).toMatchObject({
      kind: "listing_accept",
      tokenId: "363",
      orderId: "fxhash-tezos-v1:listing:2",
      price: "10000000",
      seller: "tz1X1vYvUhXRuedJigE8aFY5ALDnbQPd1MeR",
      buyer: "tz1UXV2pDd8DM3Jicru3o6fZZfHeKnBYbs4H",
      saleKind: "secondary",
    })
  })
})

describe("decodeMintOperation", () => {
  it("records the paid amount as a primary sale", () => {
    const op: TzktOperation = {
      id: 491505740414976,
      level: 3240869,
      timestamp: "2023-04-01T00:00:00Z",
      sender: { address: "tz1QXGY9z6RWC6Toy88ixFfsXFKwEN9q5khd" },
      amount: 2500000,
      parameter: { entrypoint: "mint", value: { issuer_id: "26049" } },
      hash: "opMint",
    }
    expect(decodeMintOperation(op, ctx)).toMatchObject({
      kind: "mint",
      marketplace: null,
      contract: "KT1default",
      tokenId: null,
      price: "2500000",
      buyer: "tz1QXGY9z6RWC6Toy88ixFfsXFKwEN9q5khd",
      saleKind: "primary",
    })
  })
})

describe("backfillTezosMarketEvents", () => {
  it("collects creations, queries follow-ups by order id, and cursors at head - buffer", async () => {
    const requested: string[] = []
    const mintTargets: string[] = []
    const respond = (url: string): unknown => {
      requested.push(url)
      if (url.includes("/v1/head")) return { level: 1000 }
      if (url.includes("entrypoint.in=listing,offer,auction")) {
        return [
          {
            id: 10,
            level: 500,
            timestamp: "2024-01-01T00:00:00Z",
            sender: { address: "tz1seller" },
            parameter: {
              entrypoint: "listing",
              value: { gentk: { id: "42", version: "0" }, price: "1000000" },
            },
            diffs: [
              {
                bigmap: 1,
                path: "listings",
                action: "add_key",
                content: {
                  key: "7",
                  value: {
                    gentk: { id: "42", version: "0" },
                    price: "1000000",
                    seller: "tz1seller",
                  },
                },
              },
            ],
            hash: "opListing",
          },
        ]
      }
      if (url.includes("entrypoint.in=listing_cancel,listing_accept")) {
        // A single order id must use the scalar filter: TzKT rejects a
        // one-item `.in` list with a 400.
        expect(url).toContain("parameter=7")
        expect(url).not.toContain("parameter.in=")
        return [
          {
            id: 11,
            level: 600,
            timestamp: "2024-01-02T00:00:00Z",
            sender: { address: "tz1buyer" },
            amount: 1000000,
            parameter: { entrypoint: "listing_accept", value: "7" },
            diffs: [
              {
                bigmap: 1,
                path: "listings",
                action: "remove_key",
                content: {
                  key: "7",
                  value: {
                    gentk: { id: "42", version: "0" },
                    price: "1000000",
                    seller: "tz1seller",
                  },
                },
              },
            ],
            hash: "opAccept",
          },
        ]
      }
      if (url.includes("entrypoint=mint&parameter.issuer_id=99")) {
        mintTargets.push(url.match(/target=(KT1\w+)/)?.[1] ?? "")
        return [
          {
            id: 12,
            level: 400,
            timestamp: "2023-12-31T00:00:00Z",
            sender: { address: "tz1minter" },
            amount: 500000,
            parameter: { entrypoint: "mint", value: { issuer_id: "99" } },
            hash: "opMint",
          },
        ]
      }
      return []
    }
    const fetchImpl = (async (input: RequestInfo | URL) =>
      new Response(JSON.stringify(respond(String(input))))) as typeof fetch

    const result = await backfillTezosMarketEvents(
      {
        chain: "tezos:mainnet",
        projectId: "v2:99",
        tokens: [{ contract: GENTK_V1, tokenId: "42" }],
      },
      { fetchImpl },
    )

    expect(result.cursor).toEqual({ level: 998 })
    expect(result.events.map(event => event.kind)).toEqual(["mint", "listing", "listing_accept"])
    const accept = result.events.find(event => event.kind === "listing_accept")
    expect(accept).toMatchObject({ buyer: "tz1buyer", price: "1000000", saleKind: "secondary" })
    // Mints are searched on every issuer, not just the one the ref names: an
    // older project can sit in the v2 ledger with its mints still on v0.
    expect(mintTargets).toContain("KT1AEVuykWeuuFX7QkEAMNtffzwhe1Z98hJS") // v0
    expect(mintTargets).toContain("KT1BJC12dG17CVvPKJ1VYaNnaT5mzfnUTwXv") // v2
    expect(mintTargets).toContain("KT1Xpmp15KfqoePNW9HczFmqaGNHwadV2a3b") // v3
    // v1 takes the bare parameter form, so it is absent from the object-filter list.
    expect(
      requested.some(
        url =>
          url.includes("KT1XCoGnfupWk7Sp8536EfrxcP73LmT68Nyr") &&
          url.includes("entrypoint=mint&parameter=99"),
      ),
    ).toBe(true)
  })

  it("batches ids with .in but falls back to the scalar filter for a single id", async () => {
    const requested: string[] = []
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input)
      requested.push(url)
      if (url.includes("/v1/head")) return new Response(JSON.stringify({ level: 1000 }))
      return new Response(JSON.stringify([]))
    }) as typeof fetch

    await backfillTezosMarketEvents(
      {
        chain: "tezos:mainnet",
        projectId: "v2:99",
        tokens: [{ contract: GENTK_V1, tokenId: "42" }],
      },
      { fetchImpl },
    )
    const creations = requested.find(url => url.includes("entrypoint.in=listing,offer,auction"))
    expect(creations).toContain("parameter.gentk.id=42")
    expect(creations).not.toContain("parameter.gentk.id.in=")

    await backfillTezosMarketEvents(
      {
        chain: "tezos:mainnet",
        projectId: "v2:99",
        tokens: [
          { contract: GENTK_V1, tokenId: "42" },
          { contract: GENTK_V1, tokenId: "43" },
        ],
      },
      { fetchImpl },
    )
    const multi = requested
      .filter(url => url.includes("entrypoint.in=listing,offer,auction"))
      .at(-1)
    expect(multi).toContain("parameter.gentk.id.in=42,43")
  })

  it("short-circuits when the cursor is already at the safe head", async () => {
    const fetchImpl = (async (input: RequestInfo | URL) => {
      if (String(input).includes("/v1/head")) return new Response(JSON.stringify({ level: 1000 }))
      throw new Error(`Unexpected request: ${String(input)}`)
    }) as typeof fetch
    const result = await backfillTezosMarketEvents(
      { chain: "tezos:mainnet", projectId: "v2:99", tokens: [] },
      { fetchImpl, sinceLevel: 998 },
    )
    expect(result).toEqual({ events: [], cursor: { level: 998 } })
  })
})
