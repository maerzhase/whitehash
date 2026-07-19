/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */
/**
 * Converts a floating-point number to its hexadecimal representation.
 *
 * This function takes a number (float or double) and returns its IEEE 754
 * double-precision floating-point representation as a hexadecimal string.
 *
 * @param n - The floating-point number to convert.
 * @returns A string representing the hexadecimal value of the input number.
 *          The string is 16 characters long, representing 8 bytes (64 bits)
 *          of the double-precision floating-point number.
 *
 * @example
 * console.log(float2hex(3.14159));
 * // Output: "400921fb54442d18"
 *
 * @remarks
 * - The function uses a DataView to handle the binary representation
 *   of the number.
 * - The resulting string is in big-endian order.
 * - This function works for both positive and negative numbers, including special
 *   values like Infinity, -Infinity, and NaN.
 */

export function float2hex(n: number): string {
  const getHex = (i: number) => i.toString(16).padStart(2, "0")
  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, n)

  return [...Array(8)].map((_, i) => getHex(view.getUint8(i))).join("")
}

