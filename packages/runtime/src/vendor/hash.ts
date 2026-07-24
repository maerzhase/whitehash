/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */
import { BASE58_CHARSET } from "./constants.js"

// todo: should maybe merge @fxhash/utils & @fxhash/shared ?
// or move this into shared ? as it's sort of blockchain-related
type Blockchain = "ETHEREUM" | "BASE" | "TEZOS"

/**
 * Generates a mock Tezos transaction hash.
 * @returns {string} The mock Tezos transaction hash.
 */
export function mockTezosTransactionHash(): string {
  const randomSequence = Array.from(
    { length: 49 },
    () => BASE58_CHARSET[(Math.random() * BASE58_CHARSET.length) | 0],
  ).join("")
  return `oo${randomSequence}`
}

/**
 * Generates a mock Ethereum transaction hash.
 * @returns {string} The mock Ethereum transaction hash.
 */
export function mockEthereumTransactionHash(): string {
  const randomBytes = Array.from({ length: 32 }, () => (Math.random() * 256) | 0)
  const hexString = Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("")
  return `0x${hexString}`
}

/**
 * Alias for mockEthereumTransactionHash function because base is eth l2.
 */
export const mockBaseTransactionHash: () => string = mockEthereumTransactionHash

/**
 * Generates a mock transaction hash for a given blockchain.
 * @param {Blockchain} chain - The blockchain to generate the mock transaction hash for.
 * @returns {string} The mock transaction hash.
 */
export function mockTransactionHash(chain: Blockchain): string {
  if (["ETHEREUM", "BASE"].includes(chain)) return mockEthereumTransactionHash()
  return mockTezosTransactionHash()
}

/**
 * Validates an Ethereum transaction hash.
 * @param {string} hash - The Ethereum transaction hash to validate.
 * @returns {boolean} True if the hash is valid, false otherwise.
 */
export function isEthereumTransactionHashValid(hash: string): boolean {
  return /^(0x)?([A-Fa-f0-9]{64})$/.test(hash)
}

/**
 * Alias for isEthereumTransactionHashValid function because base is eth l2.
 */
export const isBaseTransactionHashValid: (hash: string) => boolean = isEthereumTransactionHashValid

/**
 * Validates a Tezos transaction hash.
 * @param {string} hash - The Tezos transaction hash to validate.
 * @returns {boolean} True if the hash is valid, false otherwise.
 */
export function isTezosTransactionHashValid(hash: string): boolean {
  if (hash.length !== 51) {
    return false
  }
  if (!hash.startsWith("oo") && !hash.startsWith("op")) {
    return false
  }
  for (let i = 2; i < hash.length; i++) {
    if (!BASE58_CHARSET.includes(hash[i]!)) return false
  }
  return true
}

/**
 * Determines the blockchain from a transaction hash.
 * @param {string} hash - The transaction hash.
 * @returns {Blockchain} The blockchain the transaction hash belongs to.
 */
export function getBlockchainFromTransactionHash(hash: string): Blockchain {
  if (isEthereumTransactionHashValid(hash)) return "ETHEREUM"
  if (isTezosTransactionHashValid(hash)) return "TEZOS"
  throw new Error("The provided value is not a valid tezos or ethereum transaction hash")
}
/**
 * Validates a transaction hash.
 * @param {string} address - The transaction hash to validate.
 * @returns {boolean} True if the transaction hash is valid for any of the supported blockchains, false otherwise.
 */
export function isTransactionHashValid(address: string): boolean {
  return [
    isTezosTransactionHashValid,
    isEthereumTransactionHashValid,
    isBaseTransactionHashValid,
  ].some(validation => validation(address))
}
