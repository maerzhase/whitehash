/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */
import {
  jsonStringifyBigint,
  serializeParamsOrNull,
  sumBytesParams,
} from "./params/index.js"
import { BlockchainType } from "./shared.js"
import type { DeepPartial } from "./vendor/index.js"
import { cloneDeep } from "./vendor/object.js"
import {
  type IRuntimeContext,
  RuntimeContextEventEmitter,
} from "./interfaces.js"
import type {
  RuntimeDefinition,
  RuntimeDetails,
  RuntimeOutput,
  RuntimeState,
  RuntimeWholeState,
} from "./types.js"
import {
  enhanceRuntimeDefinition,
  hashRuntimeHardState,
  hashRuntimeState,
  mergeWithKeepingUint8ArrayType,
  quickHash,
} from "./utils.js"

const DEFAULT_RUNTIME_STATE: RuntimeState = Object.freeze({
  hash: "",
  minter: "",
  iteration: "1",
  params: {},
  chain: BlockchainType.ETHEREUM,
})

const DEFAULT_RUNTIME_DEFINITION: RuntimeDefinition = Object.freeze({
  params: null,
  version: null,
  features: null,
})

const DEFAULT_RUNTIME_DETAILS: RuntimeDetails = Object.freeze({
  params: {
    inputBytes: null,
    bytesSize: 0,
  },
  stateHash: {
    soft: "",
    hard: "",
  },
  definitionHash: {
    params: "",
  },
})

const DEFAULT_RUNTIME_OUTPUT: RuntimeOutput = Object.freeze({
  features: null,
})

export interface RuntimeParams {
  state?: Partial<RuntimeState>
  definition?: Partial<RuntimeDefinition>
}

export function runtimeContext(initial: RuntimeParams): IRuntimeContext {
  const emitter = new RuntimeContextEventEmitter()

  let _runtime: RuntimeWholeState = {
    state: {
      ...DEFAULT_RUNTIME_STATE,
      ...initial?.state,
    },
    definition: {
      ...DEFAULT_RUNTIME_DEFINITION,
      ...initial?.definition,
    },
    details: DEFAULT_RUNTIME_DETAILS,
    output: DEFAULT_RUNTIME_OUTPUT,
  }

  _runtime.definition = enhanceRuntimeDefinition(_runtime)
  _runtime.details = getDetails()

  function getDetails() {
    return {
      params: {
        inputBytes: serializeParamsOrNull(
          _runtime.state.params || {},
          _runtime.definition.params || []
        ),
        bytesSize: sumBytesParams(_runtime.definition.params || []),
      },
      stateHash: {
        soft: hashRuntimeState(_runtime.state),
        hard: hashRuntimeHardState(_runtime.state, _runtime.definition.params),
      },
      definitionHash: {
        params: quickHash(jsonStringifyBigint(_runtime.definition.params)),
      },
    }
  }

  return {
    state: () => _runtime.state,
    updateState: (newState: Partial<RuntimeState>) => {
      _runtime.state = mergeWithKeepingUint8ArrayType(
        cloneDeep(_runtime.state),
        newState
      )
      _runtime.details = getDetails()
      emitter.emit("context-changed", _runtime)
      return _runtime
    },
    definition: () => _runtime.definition,
    updateDefinition: (newDefinition: Partial<RuntimeDefinition>) => {
      _runtime.definition = mergeWithKeepingUint8ArrayType(
        cloneDeep(_runtime.definition),
        newDefinition
      )
      _runtime.definition = enhanceRuntimeDefinition(_runtime)
      _runtime.details = getDetails()
      emitter.emit("context-changed", _runtime)
      return _runtime
    },
    output: () => _runtime.output,
    updateOutput: (newOutput: Partial<RuntimeOutput>) => {
      _runtime.output = mergeWithKeepingUint8ArrayType(
        cloneDeep(_runtime.output),
        newOutput
      )
      emitter.emit("context-changed", _runtime)
      return _runtime
    },
    whole: () => _runtime,
    update: (data: DeepPartial<RuntimeWholeState>) => {
      _runtime = mergeWithKeepingUint8ArrayType(cloneDeep(_runtime), data)
      _runtime.definition = enhanceRuntimeDefinition(_runtime)
      _runtime.details = getDetails()
      emitter.emit("context-changed", _runtime)
      return _runtime
    },
    details: () => _runtime.details,
    emitter,
  }
}
