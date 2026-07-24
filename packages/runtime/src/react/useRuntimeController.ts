/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */

import { type RefCallback, useCallback, useEffect, useMemo, useState } from "react"
import {
  type ControlState,
  type ControlsChangedEventPayload,
  createRuntimeController,
  type IRuntimeController,
  type IRuntimeControllerOptions,
  type ProjectState,
  type RuntimeWholeState,
} from "../index.js"

export interface IUseRuntimeControllerReturn {
  controller: IRuntimeController
  runtime: RuntimeWholeState
  controls: ControlState
  restart: (iframe: HTMLIFrameElement) => void
  ref: RefCallback<HTMLIFrameElement>
}

export type UseRuntimeController = (params: {
  state: ProjectState
  options?: IRuntimeControllerOptions
}) => IUseRuntimeControllerReturn

export const useRuntimeController: UseRuntimeController = ({ state, options }) => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: ok
  const controller = useMemo<IRuntimeController>(
    () =>
      createRuntimeController({
        state,
        options: {
          ...options,
        },
      }),
    // since objects are compared by reference and not by value
    // we explicitly pass the values to the dependency array
    [
      state.cid,
      state.chain,
      state.snippetVersion,
      state.hash,
      state.iteration,
      state.minter,
      state.context,
      state.inputBytes,
      state.definition,
      state.parentHashes,
      state.legacy,
      options?.autoRefresh,
      options?.connector,
    ],
  )
  const [runtime, setRuntime] = useState<RuntimeWholeState>(() => controller.runtime().whole())
  const [controls, setControls] = useState<ControlState>(() => controller.controls().state())

  const ref = useCallback(
    (iframe: HTMLIFrameElement) => {
      if (iframe) {
        if (!controller.initialized()) {
          controller.init(iframe)
        } else {
          controller.restart(iframe)
        }
      }
    },
    [controller],
  )

  useEffect(() => {
    function onControlsChange({ state }: ControlsChangedEventPayload) {
      setControls({ ...state })
    }
    function onRuntimeChange(_runtime: RuntimeWholeState) {
      setRuntime({ ..._runtime })
    }
    controller.emitter.on("runtime-changed", onRuntimeChange)
    controller.emitter.on("controls-changed", onControlsChange)
    return () => {
      controller.emitter.off("runtime-changed", onRuntimeChange)
      controller.emitter.off("controls-changed", onControlsChange)
      controller.release()
    }
  }, [controller])

  return {
    controller,
    runtime,
    controls,
    restart: (iframe: HTMLIFrameElement) => {
      controller.restart(iframe)
    },
    ref,
  }
}
