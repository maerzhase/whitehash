/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */
export type FxParamType =
  | "number"
  | "bigint"
  | "boolean"
  | "color"
  | "string"
  | "bytes"
  | "select"

export type FxParamOptionsMap = {
  [Type in FxParamType]: {
    number: {
      min?: number
      max?: number
      step?: number
    }
    bigint: {
      min?: number | bigint
      max?: number | bigint
    }
    boolean: undefined
    color: undefined
    string: {
      minLength?: number
      maxLength?: number
    }
    bytes: {
      length: number
    }
    select: {
      options: string[]
    }
  }[Type]
}

export type FxParamTypeMap = {
  [Type in FxParamType]: {
    number: number
    bigint: bigint
    boolean: boolean
    color: string
    string: string
    bytes: Uint8Array
    select: string
  }[Type]
}

export type FxParamTransformationTypeMap = {
  [Type in FxParamType]: {
    number: number
    bigint: bigint
    boolean: boolean
    color: {
      hex: {
        rgb: string
        rgba: string
      }
      obj: {
        rgb: { r: number; g: number; b: number }
        rgba: { r: number; g: number; b: number; a: number }
      }
      arr: {
        rgb: [number, number, number]
        rgba: [number, number, number, number]
      }
    }
    string: string
    bytes: Uint8Array
    select: string
  }[Type]
}

export type FxParamUpdateMode = "page-reload" | "sync" | "code-driven"

export type FxParamValue<Type extends FxParamType> = FxParamTypeMap[Type]

export interface FxParamDefinition<Type extends FxParamType> {
  id: string
  name?: string
  type: Type
  update?: FxParamUpdateMode
  default: FxParamTypeMap[Type]
  value: FxParamTypeMap[Type]
  options: FxParamOptionsMap[Type]
  version?: string
}

export type FxParamDefinitions = FxParamDefinition<FxParamType>[]

export type hexString = `#${string}`

export type FxParamProcessorTransformer<Type extends FxParamType> = (
  value: FxParamTypeMap[Type],
  definition?: FxParamDefinition<Type>
) => FxParamTransformationTypeMap[Type]

export type FxParamProcessorConstrainer<Type extends FxParamType> = (
  value: FxParamTypeMap[Type],
  definition: FxParamDefinition<Type>
) => FxParamTypeMap[Type]

export interface FxParamProcessor<Type extends FxParamType> {
  serialize: (
    input: FxParamTypeMap[Type],
    definition: FxParamDefinition<Type>
  ) => string
  deserialize: (
    input: string,
    definition: FxParamDefinition<Type>
  ) => FxParamTypeMap[Type]
  bytesLength: (definition: FxParamDefinition<Type>) => number
  transform?: FxParamProcessorTransformer<Type>
  constrain?: FxParamProcessorConstrainer<Type>
  random: (definition: FxParamDefinition<Type>) => FxParamTypeMap[Type]
}

export type FxParamProcessors = {
  [T in FxParamType]: FxParamProcessor<T>
}

export type FxParamTranformType = "transform" | "constrain"

// biome-ignore lint/suspicious/noExplicitAny: ok
export type FxParamsData = Record<string, any>

export type FxParamsRaw = Record<string, FxParamValue<FxParamType>>
export type FxParamTransformation = FxParamTransformationTypeMap[FxParamType]
export type FxParamsTransformed = Record<string, FxParamTransformation>

