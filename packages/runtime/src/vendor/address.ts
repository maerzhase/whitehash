/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */
import { BASE58_CHARSET } from "./constants.js"

// todo: should maybe merge @fxhash/utils & @fxhash/shared ?
// or move this into shared ? as it's sort of blockchain-related
type Blockchain = "ETHEREUM" | "BASE" | "TEZOS"

export function mockEthereumAddress(): string {
  const randomBytes = Array.from(
    { length: 20 },
    () => (Math.random() * 256) | 0
  )
  const hexString = Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("")
  return `0x${hexString}`
}

export const mockBaseAddress: () => string = mockEthereumAddress

export function mockTezosAddress() {
  const randomSequence = Array.from(
    { length: 33 },
    () => BASE58_CHARSET[(Math.random() * BASE58_CHARSET.length) | 0]
  ).join("")
  return `tz1${randomSequence}`
}

export function mockBlockchainAddress(chain: Blockchain): string {
  if (["ETHEREUM", "BASE"].includes(chain)) return mockEthereumAddress()
  return mockTezosAddress()
}

export function isTezosAddressValid(address: string): boolean {
  if (address.length !== 36) {
    return false
  }
  if (!/^(tz|KT)[1-4]/.test(address)) {
    return false
  }
  for (let i = 0; i < address.length; i++) {
    if (!BASE58_CHARSET.includes(address[i]!)) return false
  }
  return true
}

export function isEthereumAddressValid(address: string): boolean {
  return /^(0x)?[0-9a-fA-F]{40}$/.test(address)
}

export const isBaseAddressValid: (address: string) => boolean =
  isEthereumAddressValid

export function getBlockchainFromAddress(address: string): Blockchain {
  if (isEthereumAddressValid(address)) return "ETHEREUM"
  if (isTezosAddressValid(address)) return "TEZOS"
  throw new Error(
    "The provided address is not a valid tezos or ethereum address"
  )
}

export function isBlockchainAddressValid(address: string): boolean {
  return [isTezosAddressValid, isEthereumAddressValid, isBaseAddressValid].some(
    validation => validation(address)
  )
}
