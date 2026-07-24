/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */
import { invariant } from "./index.js"

export enum Init {
  NOT_STARTED = "NOT_STARTED",
  STARTED = "STARTED",
  FINISHED = "FINISHED",
  FAILED = "FAILED",
}

const initStartErrorMessage = {
  [Init.STARTED]: `Initialization already in process`,
  [Init.FINISHED]: `Already been intialized`,
  [Init.FAILED]: `Already failed`,
}

const initFinishErrorMessage = {
  [Init.NOT_STARTED]: `Initialization cannot finish if it has not started`,
  [Init.FINISHED]: `Initialization has already finished`,
  [Init.FAILED]: `Already failed`,
}

/**
 * An utility initialization module for handling async initializations which can
 * only be done once.
 *
 * @example
 *
 * ```ts
 * class Something {
 *   private _init = initialization()
 *
 *   public async init() {
 *     this._init.start() // will throw if already started
 *     // ... some async stuff ...
 *     this._init.finish()
 *   }
 *
 *   public requiresInit() {
 *     this._init.check("not finished") // throws if not finished
 *   }
 * }
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: ok
export function intialization<Err extends Error = any>() {
  let state: Init = Init.NOT_STARTED
  let failReason: InitializationError<Err> | undefined

  return {
    /**
     * The initialization state. **Note:** while exposed by the API it is not
     * recommended to use this value directly.
     */
    get state(): Init {
      return state
    },
    /**
     * Whether the initialization is finished.
     */
    get finished(): boolean {
      return state === Init.FINISHED
    },
    /**
     * Whether the initialization has failed.
     */
    failed(): boolean {
      return state === Init.FAILED
    },
    /**
     * When initialization fails, this function should be called to set the
     * state as failed.
     * @param reason Failure reason
     */
    fail(reason: Err): InitializationError<Err> {
      invariant(reason, "a fail reason must be provided")
      state = Init.FAILED
      failReason = new InitializationError(reason)
      return failReason
    },
    /**
     * The reason of failure, or null if no failure happened.
     */
    get failReason(): InitializationError<Err> | undefined {
      return failReason
    },
    /**
     * Throws an error if initialization is not finished.
     * @param message Optional message for thrown exception
     */
    check(message?: string): void {
      if (state === Init.FAILED) throw failReason
      invariant(state === Init.FINISHED, message || "Initialization not finished")
    },
    /**
     * Sets the initialization state to `STARTED`. Will throw an error if the
     * initialization is either `STARTED` (in progress) or `FINISHED`. This
     * module is only designed for only-once initialization processes.
     * @param message Optional message for thrown exception
     */
    start(message?: string): void {
      invariant(
        state === Init.NOT_STARTED,
        message || initStartErrorMessage[state as Init.FINISHED | Init.STARTED | Init.FAILED],
      )
      state = Init.STARTED
    },
    /**
     * Sets the initialization state to `FINISHED`. Will throw an error if the
     * current initialization state is `NOT_STARTED` or `FINISHED`: it's only
     * possible to finish an intialization which has started but isn't finished.
     * @param message Optional message for thrown exception
     */
    finish(message?: string): void {
      invariant(
        state === Init.STARTED,
        message || initFinishErrorMessage[state as Init.FINISHED | Init.NOT_STARTED | Init.FAILED],
      )
      state = Init.FINISHED
    },
  }
}

export type Initialization = ReturnType<typeof intialization>

class UnknownError extends Error {
  override name = "UnknownError" as const
}

export class InitializationError<Reason extends Error> extends Error {
  override name = "InitializationError" as const
  override cause: Reason | UnknownError
  constructor(cause?: Reason) {
    super("InitializationError")
    this.cause = cause || new UnknownError()
  }
}

/**
 * @example
 *
 * ```ts
 * const init = initialization()
 * const initFn = initOnce(init, async () => {
 *   // do async tasks...
 * })
 * await initOnce() // ok
 * await initOnce() // throws
 * ```
 */
export function initOnce(init: Initialization, fn: () => Promise<void>): () => Promise<void> {
  return async () => {
    try {
      init.start()
      await fn()
      init.finish()
      // biome-ignore lint/suspicious/noExplicitAny: ok
    } catch (err: any) {
      throw init.fail(err)
    }
  }
}
