/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */
import {
  buildParamsObject,
  deserializeParams,
  type FxParamsData,
} from "./params/index.js"
import {
  cleanup,
  intialization,
  invariant,
  mockBlockchainAddress,
  mockTransactionHash,
} from "./vendor/index.js"
import { debounce } from "./vendor/debounce.js"
import {
  type ControlsChangedEventPayload,
  type IRuntimeConnector,
  type IRuntimeContext,
  type IRuntimeController,
  RuntimeControllerEventEmitter,
} from "./interfaces.js"
import type { ControlState, ProjectState, RuntimeWholeState } from "./types.js"
import { directRuntimeConnector } from "./connectors.js"
import { runtimeContext } from "./context.js"
import { runtimeControls } from "./controls.js"
import { addVersionToParamsDefinition } from "./utils.js"

/**
 * This function is used to handle old snippet events for projects
 * that use < v3.3.0 of the @fxhash/project-sdk
 */

function handleOldSnippetEvents(e: any, runtime: IRuntimeContext) {
  if (!e.data || !e.data.id) return

  switch (e.data.id) {
    case "fxhash_getHash":
      if (e.data.data) {
        runtime.updateState({ hash: e.data.data })
      }
      break

    case "fxhash_getFeatures":
      runtime.updateOutput({ features: e.data.data || null })
      break

    case "fxhash_getParams":
      if (e.data.data?.definitions) {
        runtime.update({
          state: { params: e.data.data.values },
          definition: { params: e.data.data.definitions },
        })
      } else {
        runtime.update({
          state: { params: {} },
          definition: { params: null },
        })
      }
      break
  }
}

export interface IRuntimeControllerOptions {
  autoRefresh?: boolean
  connector?: IRuntimeConnector
}

const DEFAULT_RUNTIME_OPTIONS: IRuntimeControllerOptions = {
  autoRefresh: false,
  connector: directRuntimeConnector,
}

export interface IRuntimeControllerParams {
  state: ProjectState
  options?: IRuntimeControllerOptions
}

/**
 * The runtime controller is the main controller for the runtime.
 * It holds the state of the runtime and the controls and keeps
 * iframe in sync with the state.
 * @param params - initial state of the runtime and options
 * @returns IRuntimeController
 */
export function createRuntimeController(
  params: IRuntimeControllerParams
): IRuntimeController {
  const clean = cleanup()
  const init = intialization()
  const options = params.options

  const runtimeOptions = { ...DEFAULT_RUNTIME_OPTIONS, ...options }
  const emitter = new RuntimeControllerEventEmitter()
  const _connector = runtimeOptions.connector

  const _controls = runtimeControls()
  const _initial = params.state
  const _initialRuntimeState = {
    hash: _initial.hash || mockTransactionHash(_initial.chain),
    minter: _initial.minter || mockBlockchainAddress(_initial.chain),
    iteration: _initial.iteration || "1",
    context: _initial.context,
    chain: _initial.chain,
    params:
      (_initial.definition &&
        _initial.inputBytes &&
        deserializeParams(
          _initial.inputBytes,
          addVersionToParamsDefinition(
            _initial.definition,
            _initial.snippetVersion
          ),
          {}
        )) ||
      {},
    parentHashes: _initial.parentHashes,
    legacy: _initial.legacy,
  }

  const _runtime = runtimeContext({
    state: _initialRuntimeState,
    definition: {
      version: _initial.snippetVersion,
      params: _initial.definition,
    },
  })

  let _iframe: HTMLIFrameElement | null = null

  let _prevRuntime: RuntimeWholeState | null = null
  _runtime.emitter.on("context-changed", _handleContextChange)
  function _handleContextChange(runtime: RuntimeWholeState) {
    // If definition or state hash changed, sync the iframe
    if (
      runtime.details.stateHash.hard !== _prevRuntime?.details.stateHash.hard
    ) {
      _syncIframe()
    }
    // If the definition changed and params are defined, update the controls
    if (
      runtime.details.definitionHash.params !==
      _prevRuntime?.details.definitionHash.params
    ) {
      _controls.update(
        runtime.definition.params
          ? buildParamsObject(runtime.definition.params, runtime.state.params)
          : {},
        runtime.definition.params
      )
    }
    emitter.emit("runtime-changed", runtime)
    _prevRuntime = { ...runtime }
  }

  let _prevControls: ControlState | null = null
  _controls.emitter.on("controls-changed", _handleControlsChange)
  function _handleControlsChange(eventData: ControlsChangedEventPayload) {
    try {
      const { update, state } = eventData
      // find the params that actually changed
      const changed = Object.keys(update)
        .filter(id =>
          !_prevControls ? true : _prevControls.params.values[id] !== update[id]
        )
        .map(id => state.params.definition?.find(d => d.id === id))
      // when there are no changes we don't need to do anything
      // e.g. when artworks call emit in a draw loop this should
      // catch too many updates that are actually not needed
      if (changed.length === 0) return
      // find params that are update mode "sync" via window.postMessage API
      const synced = changed.filter(
        (def): def is NonNullable<typeof def> => def?.update === "sync"
      )
      // if at least one change, soft refresh "sync" params
      if (Object.keys(synced).length > 0) {
        softUpdateParams(
          Object.fromEntries(synced.map(def => [def.id, update[def.id]]))
        )
      }
      if (!eventData.options?.forceRefresh) {
        // if auto-refresh is defined, we update params on the runtime
        if (options?.autoRefresh) {
          _updateParamsDebounced({
            params: update,
          })
        }
      } else {
        _runtime.updateState({ params: update })
      }
    } catch (err) {
      console.error(err)
    } finally {
      emitter.emit("controls-changed", eventData)
      _prevControls = eventData.state
    }
  }

  const _updateParamsDebounced = debounce(_runtime.updateState, 200)

  function softUpdateParams(params: FxParamsData) {
    invariant(_iframe, "_iframe is required")
    _updateParamsDebounced({ params })
    // TODO: refactor message event handling
    _iframe.contentWindow?.postMessage(
      { id: "fxhash_params:update", data: { params } },
      "*"
    )
  }

  function _onMessage(e: MessageEvent) {
    // TODO: refactor message event handling
    if (e.data.id === "fxhash_getInfo") {
      const {
        version,
        params: { definitions, values },
        minter,
        features,
        hash,
      } = e.data.data

      _runtime.update({
        state: { hash, minter, params: values },
        definition: { params: definitions, version },
        output: { features },
      })
    }
    // TODO: refactor message event handling
    if (e.data.id === "fxhash_emit:params:update") {
      const { params } = e.data.data
      _controls.update(params)
    }
    // handle deprecated events from old snippet
    handleOldSnippetEvents(e, _runtime)
  }

  function _registerWindowMessageListeners() {
    invariant(window, "window is required")
    window.addEventListener("message", _onMessage, false)
    clean.add(() => window.removeEventListener("message", _onMessage, false))
  }

  function _onIframeLoad() {
    invariant(_iframe, "_iframe is required")
    // TODO: refactor message event handling
    _iframe.contentWindow?.postMessage("fxhash_getInfo", "*")
    _iframe.contentWindow?.postMessage("fxhash_getFeatures", "*")
    _iframe.contentWindow?.postMessage("fxhash_getParams", "*")
    _iframe.contentWindow?.postMessage("fxhash_getHash", "*")
  }

  function _registerIframeOnLoadListener() {
    invariant(_iframe, "_iframe is required")
    _iframe.addEventListener("load", _onIframeLoad, true)
    clean.add(() => _iframe?.removeEventListener("load", _onIframeLoad, true))
  }

  function getUrl(runtime: IRuntimeContext) {
    invariant(_connector, "_connector is required")
    const runtimeState = runtime.state()
    const runtimeDefinition = runtime.definition()
    const runtimeDetails = runtime.details()
    return _connector.getUrl({
      cid: _initial.cid,
      hash: runtimeState.hash,
      minter: runtimeState.minter,
      iteration: runtimeState.iteration,
      inputBytes: runtimeDetails.params.inputBytes || _initial.inputBytes,
      context: runtimeState.context,
      snippetVersion: runtimeDefinition.version || "",
      chain: runtimeState.chain,
      parentHashes: runtimeState.parentHashes,
      legacy: runtimeState.legacy,
    })
  }

  function _syncIframe() {
    invariant(_iframe, "_iframe is required")
    _iframe.contentWindow?.location.replace(getUrl(_runtime))
  }

  function _init(iframe: HTMLIFrameElement) {
    invariant(iframe, "iframe is required")
    _iframe = iframe
    _registerWindowMessageListeners()
    _registerIframeOnLoadListener()
    _syncIframe()
  }

  return {
    initialized: () => init.finished,
    init: (iframe: HTMLIFrameElement) => {
      try {
        init.start()
        _init(iframe)
        init.finish()
      } catch (err) {
        throw init.fail(err)
      }
    },
    release: () => {
      clean.clear()
    },
    restart: (iframe: HTMLIFrameElement) => {
      clean.clear()
      _init(iframe)
      // Reset the runtime state to the initial state
      _runtime.updateState(_initialRuntimeState)
    },
    runtime: () => _runtime,
    controls: () => _controls,
    getUrl: () => getUrl(_runtime),
    hardSync: () => {
      _runtime.update({
        state: {
          params: _controls.state().params.values,
        },
      })
      _syncIframe()
    },
    emitter,
  }
}
