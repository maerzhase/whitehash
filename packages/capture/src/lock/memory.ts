import { randomUUID } from "node:crypto"
import type { CaptureLock } from "./lock.js"

export function memoryLock(): CaptureLock {
  const leases = new Map<string, { token: string; expiresAt: number }>()
  return {
    async acquire(key, ttlMs) {
      const current = leases.get(key)
      if (current && current.expiresAt > Date.now()) return null
      const token = randomUUID()
      leases.set(key, { token, expiresAt: Date.now() + ttlMs })
      return { key, token }
    },
    async release(lease) {
      if (leases.get(lease.key)?.token === lease.token) leases.delete(lease.key)
    },
  }
}
