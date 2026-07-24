/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */
import {
  type FxParamDefinitions,
  type FxParamsData,
  serializeParamsOrNull,
} from "./params/index.js"
import { invariant } from "./vendor/index.js"
import { cloneDeep } from "./vendor/object.js"
import {
  type IRuntimeControls,
  RuntimeControlsEventEmitter,
  type RuntimeControlsUpdateOptions,
} from "./interfaces.js"
import type { ControlState } from "./types.js"
import { mergeWithKeepingUint8ArrayType } from "./utils.js"

const DEFAULT_CONTROL_STATE: ControlState = Object.freeze({
  params: {
    definition: null,
    values: {},
  },
})
/**
 * The runtime controls hold the state of the fx(params).
 * @param initial - initial state of the controls
 * @returns RuntimeControls - Which exoses the state, update method and an event emitter
 * @public
 */
export function runtimeControls(initial: ControlState = DEFAULT_CONTROL_STATE): IRuntimeControls {
  const emitter = new RuntimeControlsEventEmitter()
  let _controls: ControlState = initial
  return {
    state: () => _controls,
    update(
      update: Partial<FxParamsData>,
      definition?: FxParamDefinitions | null,
      options?: RuntimeControlsUpdateOptions,
    ) {
      invariant(
        Object.keys(update).every(id =>
          (definition || _controls.params.definition)?.find(d => d.id === id),
        ),
        "Unknown parameter. Please provide the definition for each parameter.",
      )
      _controls = mergeWithKeepingUint8ArrayType(cloneDeep(_controls), {
        params: {
          values: update,
          definition: definition || _controls.params.definition,
        },
      })
      const payload = { update, state: _controls, options }
      emitter.emit("controls-changed", payload)
      return payload
    },
    emitter,
    getInputBytes() {
      return serializeParamsOrNull(_controls.params.values || {}, _controls.params.definition || [])
    },
  }
}
