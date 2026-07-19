/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */
import type { FxParamDefinitions, FxParamsData } from "./params/index.js"
import type { BlockchainType, RawTokenFeatures } from "./shared.js"

/**
 * The execution context of the runtime
 * - standalone: The runtime is used for standalone display
 * - minting: The runtime is used for minting
 * - capture: The runtime is used for capture
 */
export type ExecutionContext =
  | "minting"
  | "standalone"
  | "capture"
  | "fast-capture"

/**
 * The state of the project that is needed to connect a project
 * with the runtime.
 */
export type ProjectState = {
  cid: string
  chain: BlockchainType
  snippetVersion?: string
  hash?: string
  iteration?: string
  minter?: string
  context?: ExecutionContext
  inputBytes?: string
  definition?: FxParamDefinitions
  parentHashes?: string[]
  legacy?: boolean
}

/**
 * The fx(params) state of a project
 * params state consists of the definition and the values
 */
export type ControlState = {
  params: {
    definition: FxParamDefinitions | null
    values: FxParamsData
  }
}

/**
 * The actual runtime state of a project that determines
 * what the project will display
 */
export type RuntimeState = Omit<ProjectState, "cid" | "snippetVersion"> & {
  params: FxParamsData
}

/**
 * The RuntimeDefinition of the project cosists of static declarations
 * that are retrieved when a project is loaded. The definition will be the same
 * regardsless of the state of the project.
 */
export type RuntimeDefinition = {
  params: FxParamDefinitions | null
  version: string | null
}

/**
 * The runtime output consists of dynamic delarations that are retrieved when
 * a project is loaded. The output will change depending on the state
 * of the project.
 */
export type RuntimeOutput = {
  features: RawTokenFeatures | null
}

/**
 * The runtime details are derived from the state and definition.
 * This includes the inputbytes of the fx(params), aswell as a soft and hard
 * hash of the state and definition.
 */
export type RuntimeDetails = {
  params: {
    /**
     * The input bytes of the fx(params)
     * or null if there is no data
     */
    inputBytes: string | null
    /**
     * The size of the input bytes. Will be 0 if there is fx(params) data.
     */
    bytesSize: number
  }
  stateHash: {
    /**
     * hash of the whole state as it is
     */
    soft: string
    /**
     * hash of the hard-refresh properties of the state
     * it excludes all fx(params) that are not in update mode "page-reload"
     */
    hard: string
  }
  definitionHash: {
    /**
     * hash of the current state of the fx(params)
     */
    params: string
  }
}

/**
 * The whole state of the runtime consists of the runtime state
 * and the runtime definition
 */
export type RuntimeWholeState = {
  state: RuntimeState
  definition: RuntimeDefinition
  details: RuntimeDetails
  output: RuntimeOutput
}

