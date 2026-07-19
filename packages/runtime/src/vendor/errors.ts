/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */
/**
 * An error that occurs when a task violates a logical condition that is assumed to be true at all times.
 */
export class InvariantError extends Error {
  override name = "InvariantError" as const
}

/**
 * Asserts that the given condition is truthy
 *
 * @param condition - Either truthy or falsy value
 * @param message - An error message
 */
export function invariant(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new InvariantError(message)
  }
}
