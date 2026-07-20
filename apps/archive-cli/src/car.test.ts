import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import { extractCar } from "./car.js"

function base32(bytes: Uint8Array): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567"
  let bits = 0
  let accumulator = 0
  let output = "b"
  for (const byte of bytes) {
    accumulator = (accumulator << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      output += alphabet[(accumulator >> bits) & 31]
    }
  }
  if (bits > 0) output += alphabet[(accumulator << (5 - bits)) & 31]
  return output
}

function rawCar(content: Uint8Array): { car: Uint8Array; cid: string } {
  const digest = createHash("sha256").update(content).digest()
  const cidBytes = Uint8Array.from([1, 0x55, 0x12, 0x20, ...digest])
  const frameLength = cidBytes.length + content.length
  const car = Uint8Array.from([1, 0, frameLength, ...cidBytes, ...content])
  return { car, cid: base32(cidBytes) }
}

describe("CAR verification", () => {
  it("verifies a raw block and exposes it as index.html", () => {
    const fixture = rawCar(new TextEncoder().encode("<!doctype html><h1>offline</h1>"))
    const result = extractCar(fixture.car, fixture.cid)
    expect(result.blocks).toBe(1)
    expect(new TextDecoder().decode(result.files.get("index.html"))).toContain("offline")
  })

  it("rejects bytes that do not match the CID multihash", () => {
    const fixture = rawCar(new TextEncoder().encode("correct"))
    fixture.car[fixture.car.length - 1] = fixture.car[fixture.car.length - 1]! ^ 1
    expect(() => extractCar(fixture.car, fixture.cid)).toThrow("hash mismatch")
  })
})
