import { describe, expect, it } from "vitest"
import type { FxParamDefinitions } from "./types.js"
import {
  consolidateParams,
  deserializeParams,
  hexToRgba,
  ParameterProcessors,
  rgbaToHex,
  serializeParams,
  serializeParamsOrNull,
  sumBytesParams,
} from "./utils.js"

const definitions: FxParamDefinitions = [
  {
    id: "amount",
    type: "number",
    default: 1.5,
    value: 1.5,
    options: { min: 0, max: 10, step: 0.5 },
  },
  {
    id: "seed",
    type: "bigint",
    default: -42n,
    value: -42n,
    options: { min: -100n, max: 100n },
  },
  {
    id: "enabled",
    type: "boolean",
    default: false,
    value: false,
    options: undefined,
  },
  {
    id: "accent",
    type: "color",
    default: "11223344",
    value: "11223344",
    options: undefined,
  },
  {
    id: "label",
    type: "string",
    default: "art",
    value: "art",
    version: "1",
    options: { maxLength: 3 },
  },
  {
    id: "payload",
    type: "bytes",
    default: new Uint8Array([0, 127, 255]),
    value: new Uint8Array([0, 127, 255]),
    options: { length: 3 },
  },
  {
    id: "style",
    type: "select",
    default: "bold",
    value: "bold",
    options: { options: ["plain", "bold"] },
  },
]

describe("runtime parameter encoding", () => {
  it("round-trips every supported parameter type in definition order", () => {
    const values = Object.fromEntries(
      definitions.map(definition => [definition.id, definition.value]),
    )
    const serialized = serializeParams(values, definitions)

    expect(serialized).toHaveLength(sumBytesParams(definitions) * 2)
    expect(deserializeParams(serialized, definitions, {})).toEqual(values)
  })

  it("uses defaults for missing values and returns null for an empty definition", () => {
    const serialized = serializeParams({}, definitions)
    expect(deserializeParams(serialized, definitions, {})).toEqual(
      Object.fromEntries(
        definitions.map(definition => [definition.id, definition.default]),
      ),
    )
    expect(serializeParamsOrNull({}, [])).toBeNull()
  })

  it("constrains numeric, string, select, and color values", () => {
    expect(ParameterProcessors.number.constrain?.(10.24, definitions[0] as never)).toBe(10)
    expect(ParameterProcessors.number.constrain?.(2.26, definitions[0] as never)).toBe(2.5)
    expect(ParameterProcessors.string.constrain?.("x", definitions[4] as never)).toBe("x")
    expect(ParameterProcessors.select.constrain?.("missing", definitions[6] as never)).toBe(
      "plain",
    )
    expect(ParameterProcessors.color.constrain?.("#abcdef1234", definitions[3] as never)).toBe(
      "abcdef12",
    )
  })

  it("converts colors consistently, including alpha", () => {
    expect(rgbaToHex(17, 34, 51, 0.5)).toBe("#11223380")
    expect(hexToRgba("#11223380")).toEqual({
      r: 17,
      g: 34,
      b: 51,
      a: 0.5,
    })
    expect(hexToRgba("#abc")).toEqual({
      r: 170,
      g: 187,
      b: 204,
      a: 1,
    })
  })
})

describe("consolidateParams", () => {
  it("prefers supplied data without mutating the source definitions", () => {
    const input = [
      {
        id: "amount",
        type: "number",
        default: 1,
        value: 1,
        options: { min: 0, max: 10 },
      },
    ] satisfies FxParamDefinitions

    const consolidated = consolidateParams(input, { amount: 0 })

    expect(consolidated[0].value).toBe(0)
    expect(input[0]!.value).toBe(1)
  })
})
