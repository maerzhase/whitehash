/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */
import type { FxParamDefinitions, FxParamsData } from "./params/index.js"
import type {
  ControlState,
  ProjectState,
  RuntimeDefinition,
  RuntimeDetails,
  RuntimeOutput,
  RuntimeState,
  RuntimeWholeState,
} from "./types.js"
import { type DeepPartial, EventEmitter } from "./vendor/index.js"

/**
 * An interface for the runtime controller.
 * The runtime controller is responsible for managing the runtime context and controls.
 * It is the main interface for interacting with the runtime.
 */
export interface IRuntimeController {
  /**
   * Holds a reference to the current runtime context.
   */
  runtime: () => IRuntimeContext

  /**
   * Holds a reference to the current fx(params) runtime controls.
   */
  controls: () => IRuntimeControls

  /**
   * Whether the runtime controller has been initialized.
   */
  initialized: () => boolean

  /**
   * Initializes the runtime controller.
   * @param iframe - The iframe element to use for the runtime.
   */
  init: (iframe: HTMLIFrameElement) => void

  /**
   * Remove event listeners, free up memory, etc.
   * Should be called when the runtime controller is disposed
   */
  release: () => void

  /**
   * Restarts the runtime controller with its current state.
   * This is particularly useful when the iframe element is
   * being added to the DOM dynamically
   * @param iframe - The iframe element to use for the runtime.
   */
  restart: (iframe: HTMLIFrameElement) => void

  /**
   * Gets the current URL of the runtime.
   */
  getUrl: () => string

  /**
   * Sets the URL of the runtime.
   */
  hardSync: () => void

  /**
   * Reference to the runtime controller event emitter which broadcasts events
   * when the runtime controller changes.
   */
  emitter: RuntimeControllerEventEmitter
}
export type RuntimeControllerEventsTypemap = {
  "runtime-changed": RuntimeWholeState
  "controls-changed": ControlsChangedEventPayload
}
export class RuntimeControllerEventEmitter extends EventEmitter<RuntimeControllerEventsTypemap> {}

/**
 * An interface for the fx(params) runtime controls.
 * The runtime controls hold the state of the fx(params). The state is used
 * to display the current state of the fx(params) in the UI.
 */
export interface IRuntimeControls {
  /**
   * Reference to the runtime controls event emitter which broadcasts events
   * when the runtime controls change.
   */
  emitter: RuntimeControlsEventEmitter

  /**
   * The current state of the runtime controls.
   * This includes the current values of the fx(params) and the definition.
   */
  state: () => ControlState

  /**
   * Updates the runtime controls with new data.
   * @param update - The data to apply
   * @param definition - The definition to apply
   * @param options - The options for the update function
   * @returns The updated runtime controls
   */
  update: (
    update: Partial<FxParamsData>,
    definition?: FxParamDefinitions | null,
    options?: RuntimeControlsUpdateOptions,
  ) => ControlsChangedEventPayload

  /**
   * Gets the input bytes of the runtime controls.
   * @returns The input bytes of the runtime controls
   * or null if there is no data
   */
  getInputBytes: () => string | null
}

/**
 * Options that can be passed to the runtime controls update function
 * - forceRefresh: If true, the runtime will be forced to refresh
 *   all fx(params) regardless of their update mode.
 */
export type RuntimeControlsUpdateOptions = {
  forceRefresh?: boolean
}

/**
 * The payload of the controls-changed event.
 * The event is emitted when the runtime controls change.
 */
export type ControlsChangedEventPayload = {
  update: Partial<FxParamsData>
  state: ControlState
  options?: RuntimeControlsUpdateOptions
}

export type RuntimeControlsEventsTypemap = {
  "controls-changed": ControlsChangedEventPayload
}
export class RuntimeControlsEventEmitter extends EventEmitter<RuntimeControlsEventsTypemap> {}

/**
 * An interface for the runtime context.
 * The runtime context holds the whole state of the current runtime.
 * This includes the state of the project, the fx(params) definition
 * and extra details that are derived from the state and definition.
 */
export interface IRuntimeContext {
  /**
   * Retrieve the latest whole state of the runtime context
   */
  whole: () => RuntimeWholeState

  /**
   * Retrieve the latest state
   */
  state: () => RuntimeState

  /**
   * Update the state of the runtime context
   * @param update
   * @returns the updated runtime whole state
   */
  updateState: (update: Partial<RuntimeState>) => RuntimeWholeState

  /**
   * Retrieve the latest definition of the runtime context.
   */
  definition: () => RuntimeDefinition

  /**
   * Update the definition of the runtime
   * @param update
   * @returns the updated runtime whole state
   * */
  updateDefinition: (update: Partial<RuntimeDefinition>) => RuntimeWholeState

  /**
   * Retrieve the latest output of the runtime context
   */
  output: () => RuntimeOutput

  /**
   * Update the output of the runtime
   * @param update
   * @returns the updated runtime whole state
   */
  updateOutput: (update: Partial<RuntimeOutput>) => RuntimeWholeState

  /**
   * Extra details that are derived from the state and definition.
   * This includes the inputbytes of the fx(params), aswell as a soft and hard
   * hash of the state and definition.
   */
  details: () => RuntimeDetails

  /**
   * Updates the runtime context with new data.
   * @param data - The data to apply
   * @returns The updated runtime whole state
   */
  update: (update: DeepPartial<RuntimeWholeState>) => RuntimeWholeState

  /**
   * A reference to the runtime context event emitter which broadcasts events
   * when the runtime context changes.
   */
  emitter: RuntimeContextEventEmitter
}
export type RuntimeContextEventsTypemap = {
  "context-changed": RuntimeWholeState
}
export class RuntimeContextEventEmitter extends EventEmitter<RuntimeContextEventsTypemap> {}

/**
 * An interface for the runtime connector.
 * The runtime connector is responsible for generating URLs for the runtime.
 */
export interface IRuntimeConnector {
  getUrl: (state: ProjectState, urlParams?: URLSearchParams) => string
}
