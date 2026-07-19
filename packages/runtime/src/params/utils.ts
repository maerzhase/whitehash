/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */
// biome-ignore-all lint/suspicious/noExplicitAny: ok

import type {
  FxParamDefinition,
  FxParamDefinitions,
  FxParamProcessor,
  FxParamProcessors,
  FxParamProcessorTransformer,
  FxParamsData,
  FxParamsRaw,
  FxParamsTransformed,
  FxParamTranformType,
  FxParamTransformation,
  FxParamType,
  FxParamTypeMap,
  FxParamValue,
  hexString,
} from "./types.js"

export function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const outParts = [
    r.toString(16),
    g.toString(16),
    b.toString(16),
    Math.round(a * 255)
      .toString(16)
      .substring(0, 2),
  ]

  // Pad single-digit output values
  outParts.forEach((part, i) => {
    if (part.length === 1) {
      outParts[i] = `0${part}`
    }
  })

  return `#${outParts.join("")}`
}

function completeHexColor(hexCode: hexString | string): string {
  let hex = hexCode.replace("#", "")
  if (hex.length === 6) {
    hex = `${hex}ff`
  }
  if (hex.length === 3) {
    hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}ff`
  }
  return hex
}

export function hexToRgba(hexCode: hexString): {
  r: number
  g: number
  b: number
  a: number
} {
  const hex = completeHexColor(hexCode)

  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const a =
    Math.round(
      (parseInt(hex.substring(6, 8), 16) / 255 + Number.EPSILON) * 100
    ) / 100

  return { r, g, b, a }
}

const stringToHex = (s: string) => {
  let rtn = ""
  for (let i = 0; i < s.length; i++) {
    rtn += s.charCodeAt(i).toString(16).padStart(4, "0")
  }
  return rtn
}
const hexToString = (h: string) => {
  const hx = h.match(/.{1,4}/g) || []
  let rtn = ""
  for (let i = 0; i < hx.length; i++) {
    const int = parseInt(hx[i]!, 16)
    if (int === 0) break
    rtn += String.fromCharCode(int)
  }
  return rtn
}

export const MIN_SAFE_INT64: bigint = BigInt("-9223372036854775808")
export const MAX_SAFE_INT64: bigint = BigInt("9223372036854775807")

export const ParameterProcessors: FxParamProcessors = {
  number: {
    serialize: input => {
      const view = new DataView(new ArrayBuffer(8))
      view.setFloat64(0, input)
      return view.getBigUint64(0).toString(16).padStart(16, "0")
    },
    deserialize: input => {
      const view = new DataView(new ArrayBuffer(8))
      for (let i = 0; i < 8; i++) {
        view.setUint8(i, parseInt(input.substring(i * 2, i * 2 + 2), 16))
      }
      return view.getFloat64(0)
    },
    bytesLength: () => 8,
    constrain: (value, definition) => {
      let min = Number.MIN_SAFE_INTEGER
      if (typeof definition.options?.min !== "undefined")
        min = Number(definition.options.min)
      let max = Number.MAX_SAFE_INTEGER
      if (typeof definition.options?.max !== "undefined")
        max = Number(definition.options.max)
      max = Math.min(max, Number.MAX_SAFE_INTEGER)
      min = Math.max(min, Number.MIN_SAFE_INTEGER)
      const v = Math.min(Math.max(value, min), max)
      if (definition?.options?.step) {
        const t = 1.0 / definition?.options?.step
        return Math.round(v * t) / t
      }
      return v
    },
    random: definition => {
      let min = Number.MIN_SAFE_INTEGER
      if (typeof definition.options?.min !== "undefined")
        min = Number(definition.options.min)
      let max = Number.MAX_SAFE_INTEGER
      if (typeof definition.options?.max !== "undefined")
        max = Number(definition.options.max)
      max = Math.min(max, Number.MAX_SAFE_INTEGER)
      min = Math.max(min, Number.MIN_SAFE_INTEGER)
      const v = Math.random() * (max - min) + min
      if (definition?.options?.step) {
        const t = 1.0 / definition?.options?.step
        return Math.round(v * t) / t
      }
      return v
    },
  },
  bigint: {
    serialize: (input: any) => {
      const view = new DataView(new ArrayBuffer(8))
      view.setBigInt64(0, BigInt(input))
      return view.getBigUint64(0).toString(16).padStart(16, "0")
    },
    deserialize: (input: any) => {
      const view = new DataView(new ArrayBuffer(8))
      for (let i = 0; i < 8; i++) {
        view.setUint8(i, parseInt(input.substring(i * 2, i * 2 + 2), 16))
      }
      return view.getBigInt64(0)
    },
    bytesLength: () => 8,
    random: definition => {
      let min = MIN_SAFE_INT64
      let max = MAX_SAFE_INT64
      if (typeof definition.options?.min !== "undefined")
        min = BigInt(definition.options.min)
      if (typeof definition.options?.max !== "undefined")
        max = BigInt(definition.options.max)
      const range = max - min
      const bits = range.toString(2).length
      let random: bigint
      do {
        random = BigInt(
          "0b" +
            Array.from(
              crypto.getRandomValues(new Uint8Array(Math.ceil(bits / 8)))
            )
              .map(b => b.toString(2).padStart(8, "0"))
              .join("")
        )
      } while (random > range)
      return random + min
    },
  },
  boolean: {
    serialize: input => {
      return typeof input === "boolean"
        ? input
          ? "01"
          : "00"
        : typeof input === "string"
          ? input === "true"
            ? "01"
            : "00"
          : "00"
    },
    deserialize: input => {
      return input !== "00"
    },
    bytesLength: () => 1,
    random: () => Math.random() < 0.5,
  },

  color: {
    serialize: (input: string) => {
      return completeHexColor(input)
    },

    deserialize: (input): hexString => {
      return input as hexString
    },
    bytesLength: () => 4,
    transform: (input: string) => {
      const color = completeHexColor(input)
      const r = parseInt(color.slice(0, 2), 16)
      const g = parseInt(color.slice(2, 4), 16)
      const b = parseInt(color.slice(4, 6), 16)
      const a = parseInt(color.slice(6, 8), 16)
      return {
        hex: {
          rgb: `#${input.slice(0, 6)}`,
          rgba: `#${input}`,
        },
        obj: {
          rgb: { r, g, b },
          rgba: { r, g, b, a },
        },
        arr: {
          rgb: [r, g, b],
          rgba: [r, g, b, a],
        },
      }
    },
    constrain: value => {
      const hex = value.replace("#", "")
      return hex.slice(0, 8).padEnd(8, "f")
    },
    random: () =>
      `${[...Array(8)]
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join("")}`,
  },

  string: {
    serialize: (input, def) => {
      if (!def.version) {
        let hex = stringToHex(input.substring(0, 64))
        hex = hex.padEnd(64 * 4, "0")
        return hex
      }
      let max = 64
      if (typeof def.options?.maxLength !== "undefined")
        max = Number(def.options.maxLength)
      let hex = stringToHex(input.substring(0, max))
      hex = hex.padEnd(max * 4, "0")
      return hex
    },
    deserialize: input => {
      return hexToString(input)
    },

    bytesLength: def => {
      if (!def.version) {
        return 64 * 2
      }
      if (typeof def.options?.maxLength !== "undefined")
        return Number(def.options.maxLength) * 2
      return 64 * 2
    },
    random: definition => {
      let min = 0
      if (typeof definition.options?.minLength !== "undefined")
        min = definition.options.minLength
      let max = 64
      if (typeof definition.options?.maxLength !== "undefined")
        max = definition.options.maxLength
      const length = Math.round(Math.random() * (max - min) + min)
      return [...Array(length)]
        .map(() => (~~(Math.random() * 36)).toString(36))
        .join("")
    },
    constrain: (value, definition) => {
      let min = 0
      if (typeof definition.options?.minLength !== "undefined")
        min = definition.options.minLength
      let max = 64
      if (typeof definition.options?.maxLength !== "undefined")
        max = definition.options.maxLength
      const v = value.slice(0, max)
      if (v.length < min) {
        return v.padEnd(min)
      }
      return v
    },
  },

  bytes: {
    serialize: input => {
      return Array.from(input)
        .map(i => i.toString(16).padStart(2, "0"))
        .join("")
    },
    deserialize: input => {
      const len = input.length / 2
      const uint8 = new Uint8Array(len)
      let idx: number
      for (let i = 0; i < len; i++) {
        idx = i * 2
        uint8[i] = parseInt(`${input[idx]}${input[idx + 1]}`, 16)
      }
      return uint8
    },
    bytesLength: def => def.options.length,
    random: def => {
      const len = def.options?.length || 0
      const uint8 = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        uint8[i] = (Math.random() * 255) | 0
      }
      return uint8
    },
  },

  select: {
    serialize: (input, def) => {
      // find the index of the input in the array of options
      return Math.min(255, def.options?.options?.indexOf(input) || 0)
        .toString(16)
        .padStart(2, "0")
    },

    deserialize: (input, def) => {
      // get the index, which is the input
      const idx = parseInt(input, 16)
      return def.options?.options?.[idx] || def.options?.options?.[0] || ""
    },

    bytesLength: () => 1, // index between 0 and 255
    constrain: (value, definition) => {
      if (definition.options.options.includes(value)) {
        return value
      }
      return definition.options.options[0] ?? ""
    },
    random: definition => {
      const index = Math.round(
        Math.random() * (definition.options.options.length - 1) + 0
      )
      return definition.options.options[index] ?? ""
    },
  },
}

// params are injected into the piece using the binary representation of the
// numbers, to keep precision
export function serializeParams(
  params: any,
  definition: FxParamDefinition<any>[]
): string {
  // a single hex string will be used for all the params
  let bytes = ""
  if (!definition) return bytes
  // loop through each parameter from the definition to find the associated
  // parameter as set on the UI
  for (const def of definition) {
    const { id, type } = def
    const processor = ParameterProcessors[
      type as FxParamType
    ] as FxParamProcessor<any>
    // if the param is definined in the object

    const v = params[id] as FxParamTypeMap[]
    const val =
      typeof v !== "undefined"
        ? v
        : typeof def.default !== "undefined"
          ? def.default
          : processor.random(def)
    const serialized = processor.serialize(val, def)
    bytes += serialized
  }

  return bytes
}

// call seralizeParams(), returns nullif no params
export function serializeParamsOrNull(
  params: FxParamsData,
  definition: FxParamDefinition<any>[]
): string | null {
  const serialized = serializeParams(params, definition || [])
  if (serialized.length === 0) return null
  return serialized
}

// takes an array of bytes, in hexadecimal format, and a parametric space
// definition and outputs an array of parameters, mapping the definition and
// validating input based on the definition constraints
export function deserializeParams(
  bytes: string,
  definition: FxParamDefinition<FxParamType>[],
  options: { withTransform?: boolean; transformType?: FxParamTranformType }
): FxParamsRaw | FxParamsTransformed {
  const params: FxParamsRaw | FxParamsTransformed = {}
  for (const def of definition) {
    const processor = ParameterProcessors[
      def.type as FxParamType
    ] as FxParamProcessor<FxParamType>
    const transformer =
      options.withTransform &&
      (processor[
        options.transformType || "transform"
      ] as FxParamProcessorTransformer<FxParamType>)
    if (!bytes) {
      let v: any
      if (typeof def.default === "undefined") v = processor.random(def)
      else v = def.default
      params[def.id] = transformer ? transformer(v, def) : v
      continue
    }
    // extract the length from the bytes & shift the initial bytes string
    const bytesLen = processor.bytesLength(def)
    const valueBytes = bytes.substring(0, bytesLen * 2)
    bytes = bytes.substring(bytesLen * 2)
    // deserialize the bytes into the params
    const val = processor.deserialize(
      valueBytes,
      def
    ) as FxParamValue<FxParamType>
    params[def.id] = transformer ? transformer(val, def) : val
  }
  return params
}

// Consolidates parameters from both a params object provided by the token
// and the dat object of params, which is stored by the controls component.
export function consolidateParams(params: any, data: any): any[] {
  if (!params) return []

  const rtn = [...params]

  for (const p in rtn) {
    const definition = rtn[p]
    const { id, type, default: def } = definition
    // biome-ignore lint/suspicious/noPrototypeBuiltins: ok
    if (data?.hasOwnProperty(data, id)) {
      rtn[p].value = data[id]
    } else {
      const processor = ParameterProcessors[
        type as FxParamType
      ] as FxParamProcessor<any>
      let v: any
      if (typeof def === "undefined") v = processor.random(definition)
      else v = def
      rtn[p].value = processor.transform?.(v) || v
    }
  }

  return rtn
}

/**
 * Given a definition and some params data, builds a clean params object where
 * the values are first found in the data object, then in the definition if a
 * default value exists, otherwise in randomizes the value using the param
 * associated processor.
 *
 * @param definition an array of parameter definition
 * @param data the params data used to reconstruct the final values
 */
export function buildParamsObject(
  definition: FxParamDefinitions,
  data: FxParamsData | null
): FxParamsData {
  if (!definition) return {}

  const out: FxParamsData = {}
  for (const def of definition) {
    // find if the data object has the propery
    // biome-ignore lint/suspicious/noPrototypeBuiltins: ok
    if (data?.hasOwnProperty(def.id)) {
      out[def.id] = data[def.id]
      continue
    }
    // find if the definition object has a default value
    // biome-ignore lint/suspicious/noPrototypeBuiltins: ok
    if (def.hasOwnProperty("default")) {
      out[def.id] = def.default
      continue
    }
    // otherwise use the param processor randomizer
    const processor = ParameterProcessors[def.type] as FxParamProcessor<any>
    const rand = processor.random(def)
    out[def.id] = processor.transform?.(rand) || rand
  }
  return out
}

export function getRandomParamValues(
  params: FxParamDefinition<FxParamType>[],
  options?: { noTransform?: boolean; randomizeAll?: boolean }
): any {
  return params.reduce(
    (acc, definition) => {
      const processor = ParameterProcessors[
        definition.type as FxParamType
      ] as FxParamProcessor<FxParamType>
      let v = (definition.value || definition.default) as FxParamType
      if (definition.update !== "code-driven" || options?.randomizeAll) {
        v = processor.random(definition) as FxParamType
      }
      if (v) {
        acc[definition.id] = options?.noTransform
          ? v
          : processor.transform?.(v) || v
      }
      return acc
    },
    {} as Record<string, any>
  )
}

export function sumBytesParams(
  definitions: FxParamDefinition<FxParamType>[]
): number {
  return (
    definitions?.reduce(
      (acc, def) =>
        acc +
        (
          ParameterProcessors[
            def.type as FxParamType
          ] as FxParamProcessor<FxParamType>
        ).bytesLength(def),
      0
    ) || 0
  )
}

export function stringifyParamsData(data: FxParamsData): string {
  return JSON.stringify(data, (_key, value) => {
    if (typeof value === "bigint") return value.toString()
    return value
  })
}

export function jsonStringifyBigint(data: any): string {
  return JSON.stringify(data, (_key, value) => {
    if (typeof value === "bigint") return value.toString()
    return value
  })
}

export const processParam = (
  paramId: string,
  value: FxParamValue<FxParamType>,
  definitions: FxParamDefinition<FxParamType>[],
  transformType: FxParamTranformType
): FxParamValue<FxParamType> | FxParamTransformation => {
  const definition = definitions.find(d => d.id === paramId)
  if (!definition) {
    throw new Error(`No definition found for param ${paramId}`)
  }
  const processor = ParameterProcessors[definition.type]
  const transformer = processor[
    transformType
  ] as FxParamProcessorTransformer<FxParamType>
  return transformer?.(value, definition) || value
}

export const processParams = (
  values: FxParamsData,
  definitions: FxParamDefinition<FxParamType>[],
  transformType: FxParamTranformType
): Record<string, FxParamValue<FxParamType>> => {
  const paramValues: Record<string, FxParamValue<FxParamType>> = {}
  for (const definition of definitions) {
    const processor = ParameterProcessors[definition.type]
    const value = values[definition.id]
    // deserialize the bytes into the params
    const transformer = processor[
      transformType
    ] as FxParamProcessorTransformer<FxParamType>
    paramValues[definition.id] = transformer?.(value, definition) || value
  }
  return paramValues
}
