/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */
/**
 * Very quick string hashing algorithm where each character is passed through
 * some xorshift variant to produce some 64bit hash represented as a number.
 * Can be useful when there is a need to derive some unique ID for unique
 * strings in a fast way.
 *
 * @param str A string as input
 *
 * @returns A hash as a 64bit number for faster processing
 *
 * @example
 * ```ts
 * const hash = xorshiftString("hello world") // 7d2fb77d
 * const hash = xorshiftString("hey")          // 216e3ffa
 * const hash = xorshiftString("a")            // 704e3821
 * const hash = xorshiftString("b")            // 4e37a71e
 * ```
 */
export function xorshiftString(str: string): number {
  let x = 0x0
  for (let i = 0; i < str.length; i++) {
    x ^= str.charCodeAt(i)
    x ^= x << 13
    x ^= x >> 7
    x ^= x << 17
  }
  return x
}

/**
 * Computes a 64bit hash (returned as a number) for any serializable value
 * passed. The value must be serializable using `JSON.stringify()` otherwise
 * this function throws.
 *
 * Under the hood, does `xorshiftString(JSON.stringify(serializable))`
 *
 * @param serializable A value which can be serialized with `JSON.stringify()`
 *
 * @returns A 64bit hash as a number
 *
 * @example
 * ```ts
 * const hash = xorshift64({ some: "value", numb: 2 }) // 7e34a2b7
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: ok
export function xorshift64(serializable: any): number {
  return xorshiftString(JSON.stringify(serializable))
}
