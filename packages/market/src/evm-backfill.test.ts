import { encodeAbiParameters, encodeEventTopics, parseAbiItem } from "viem"
import { describe, expect, it } from "vitest"
import { decodeSeaportSale, toSaleEvents } from "./evm-backfill.js"

const ORDER_FULFILLED = parseAbiItem(
  "event OrderFulfilled(bytes32 orderHash, address indexed offerer, address indexed zone, address recipient, (uint8 itemType, address token, uint256 identifier, uint256 amount)[] offer, (uint8 itemType, address token, uint256 identifier, uint256 amount, address recipient)[] consideration)",
)

const COLLECTION = "0x1111111111111111111111111111111111111111" as const
const WETH = "0x2222222222222222222222222222222222222222" as const
const SELLER = "0x3333333333333333333333333333333333333333" as const
const BUYER = "0x4444444444444444444444444444444444444444" as const
const FEES = "0x5555555555555555555555555555555555555555" as const
const ORDER_HASH = `0x${"ab".repeat(32)}` as const

const SPENT_ITEM = {
  type: "tuple[]",
  components: [
    { type: "uint8", name: "itemType" },
    { type: "address", name: "token" },
    { type: "uint256", name: "identifier" },
    { type: "uint256", name: "amount" },
  ],
} as const

const RECEIVED_ITEM = {
  type: "tuple[]",
  components: [...SPENT_ITEM.components, { type: "address", name: "recipient" }],
} as const

type Spent = { itemType: number; token: `0x${string}`; identifier: bigint; amount: bigint }
type Received = Spent & { recipient: `0x${string}` }

function fulfilledLog(offer: Spent[], consideration: Received[]) {
  const topics = encodeEventTopics({
    abi: [ORDER_FULFILLED],
    eventName: "OrderFulfilled",
    args: { offerer: SELLER, zone: `0x${"00".repeat(20)}` },
  })
  const data = encodeAbiParameters(
    [{ type: "bytes32" }, { type: "address" }, SPENT_ITEM, RECEIVED_ITEM],
    [ORDER_HASH, BUYER, offer, consideration],
  )
  return { data, topics: topics as [`0x${string}`, ...`0x${string}`[]] }
}

describe("decodeSeaportSale", () => {
  it("prices a listing fill from all payment consideration items (fees included)", () => {
    const log = fulfilledLog(
      [{ itemType: 2, token: COLLECTION, identifier: 7n, amount: 1n }],
      [
        {
          itemType: 0,
          token: `0x${"00".repeat(20)}`,
          identifier: 0n,
          amount: 950n,
          recipient: SELLER,
        },
        {
          itemType: 0,
          token: `0x${"00".repeat(20)}`,
          identifier: 0n,
          amount: 50n,
          recipient: FEES,
        },
      ],
    )
    expect(decodeSeaportSale(log, COLLECTION)).toEqual({
      orderHash: ORDER_HASH,
      tokenId: "7",
      price: 1000n,
    })
  })

  it("prices an accepted offer from the offered payment items", () => {
    const log = fulfilledLog(
      [{ itemType: 1, token: WETH, identifier: 0n, amount: 750n }],
      [{ itemType: 2, token: COLLECTION, identifier: 9n, amount: 1n, recipient: BUYER }],
    )
    expect(decodeSeaportSale(log, COLLECTION)).toEqual({
      orderHash: ORDER_HASH,
      tokenId: "9",
      price: 750n,
    })
  })

  it("ignores fills of other collections", () => {
    const log = fulfilledLog(
      [{ itemType: 2, token: WETH, identifier: 7n, amount: 1n }],
      [
        {
          itemType: 0,
          token: `0x${"00".repeat(20)}`,
          identifier: 0n,
          amount: 100n,
          recipient: SELLER,
        },
      ],
    )
    expect(decodeSeaportSale(log, COLLECTION)).toBe(null)
  })

  it("ignores logs that are not OrderFulfilled", () => {
    expect(decodeSeaportSale({ data: "0x", topics: [`0x${"11".repeat(32)}`] }, COLLECTION)).toBe(
      null,
    )
  })
})

describe("toSaleEvents", () => {
  it("counts a matchOrders fill once despite two OrderFulfilled logs", () => {
    const tx = `0x${"cd".repeat(32)}` as const
    const candidate = {
      txHash: tx,
      block: 100,
      timestamp: "2024-01-01T00:00:00.000Z",
      tokenId: "7",
      from: SELLER,
      to: BUYER,
    }
    // matchOrders emits one log per component order, both naming the token.
    const listingSide = fulfilledLog(
      [{ itemType: 2, token: COLLECTION, identifier: 7n, amount: 1n }],
      [
        {
          itemType: 0,
          token: `0x${"00".repeat(20)}`,
          identifier: 0n,
          amount: 1000n,
          recipient: SELLER,
        },
      ],
    )
    const offerSide = fulfilledLog(
      [{ itemType: 1, token: WETH, identifier: 0n, amount: 1000n }],
      [{ itemType: 2, token: COLLECTION, identifier: 7n, amount: 1n, recipient: BUYER }],
    )
    const events = toSaleEvents(
      [candidate],
      new Map([
        [
          tx,
          [
            { ...listingSide, index: 1 },
            { ...offerSide, index: 2 },
          ],
        ],
      ]),
      { chain: "eip155:8453", contract: COLLECTION },
    )
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      kind: "sale",
      tokenId: "7",
      price: "1000",
      seller: SELLER,
      buyer: BUYER,
      sourceId: "100-1",
    })
  })
})

describe("zero-payment fills", () => {
  it("skips NFT-for-NFT barters, which carry no payment items", () => {
    const tx = `0x${"ef".repeat(32)}` as const
    const barter = fulfilledLog(
      [{ itemType: 2, token: COLLECTION, identifier: 5n, amount: 1n }],
      [{ itemType: 2, token: WETH, identifier: 9n, amount: 1n, recipient: SELLER }],
    )
    const events = toSaleEvents(
      [
        {
          txHash: tx,
          block: 10,
          timestamp: "2024-01-01T00:00:00.000Z",
          tokenId: "5",
          from: SELLER,
          to: BUYER,
        },
      ],
      new Map([[tx, [{ ...barter, index: 0 }]]]),
      { chain: "eip155:1", contract: COLLECTION },
    )
    expect(events).toEqual([])
  })
})
