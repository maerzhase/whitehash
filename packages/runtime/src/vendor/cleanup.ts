/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */
type Cleaner = () => void

/**
 * Simple cleanup utility.
 *
 * @example
 *
 * ```ts
 * const clean = cleanup()
 * //...
 * clean.add(
 *   () => document.removeEventListener("click", clickHandler),
 *   () => document.removeEventListener("mousemove", mouseHandler),
 * )
 * //...
 * clean.clear()
 * ```
 */
export function cleanup(): {
  add: (...cleaners: Cleaner[]) => number
  clear: () => void
} {
  const _toClean: Cleaner[] = []
  return {
    add: (...cleaners: Cleaner[]) => _toClean.push(...cleaners),
    clear: () => {
      _toClean.forEach(fn => {
        fn()
      })
      _toClean.length = 0
    },
  }
}
