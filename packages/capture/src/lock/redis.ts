import { randomUUID } from "node:crypto"
import type { CaptureLock } from "./lock.js"

export interface RedisLockClient {
  set(key: string, value: string, options: { NX: true; PX: number }): Promise<string | null>
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>
}

export interface RedisLockOptions {
  client: RedisLockClient
  prefix?: string
}

const RELEASE_SCRIPT =
  'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end'

export function redisLock(options: RedisLockOptions): CaptureLock {
  const redisKey = (key: string) => `${options.prefix ?? "capture-lock:"}${key}`
  return {
    async acquire(key, ttlMs) {
      const token = randomUUID()
      const result = await options.client.set(redisKey(key), token, {
        NX: true,
        PX: ttlMs,
      })
      return result ? { key, token } : null
    },
    async release(lease) {
      await options.client.eval(RELEASE_SCRIPT, {
        keys: [redisKey(lease.key)],
        arguments: [lease.token],
      })
    },
  }
}
