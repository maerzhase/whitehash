import { describe, expect, it } from "vitest"
import { filterFeatures } from "./features.js"

describe("filterFeatures", () => {
  it("keeps scalar token attributes and drops unsupported values", () => {
    expect(
      filterFeatures({
        Color: "blue",
        Count: 4,
        Rare: true,
        Null: null,
        Nested: { no: true },
        List: [1],
      }),
    ).toEqual([
      { name: "Color", value: "blue" },
      { name: "Count", value: 4 },
      { name: "Rare", value: true },
    ])
  })

  it.each([null, undefined, [], "value", 2, new Date()])("rejects a non-plain object", value => {
    expect(filterFeatures(value)).toEqual([])
  })
})
