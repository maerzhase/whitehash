import type { Browser } from "puppeteer-core"
import type { BrowserProvider } from "./browser/provider.js"
import { capture } from "./capture.js"
import { CaptureError, asCaptureError } from "./errors.js"
import type { CaptureLock } from "./lock/lock.js"
import type { CaptureStore, StoredCapture } from "./store/store.js"
import type {
  CaptureOptions,
  CaptureResult,
  CaptureSettings,
  WireCaptureSettings,
} from "./types.js"

export interface CaptureTarget {
  key: string
  url: string
  settings: CaptureSettings | WireCaptureSettings | Record<string, unknown>
  captureOptions?: Omit<CaptureOptions, "url" | "settings" | "browser">
}

export interface CaptureHandlerConfig {
  browser: BrowserProvider | Browser
  resolve(request: Request): Promise<CaptureTarget | null> | CaptureTarget | null
  store?: CaptureStore
  lock?: CaptureLock
  headers?: HeadersInit
  lockTtlMs?: number
  waiterTimeoutMs?: number
  waiterPollMs?: number
  postprocess?(
    result: CaptureResult,
    target: CaptureTarget,
  ): Promise<StoredCapture> | StoredCapture
  /** Primarily useful for deterministic integration tests and custom queue wrappers. */
  captureFn?: typeof capture
}

const sleep = (milliseconds: number) =>
  new Promise(resolve => setTimeout(resolve, milliseconds))

function responseBody(value: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(value.byteLength)
  copy.set(value)
  return copy.buffer
}

function errorStatus(error: CaptureError): number {
  if (error.code === "TIMEOUT") return 504
  if (
    error.code === "MISSING_PARAMETERS" ||
    error.code === "INVALID_PARAMETERS" ||
    error.code === "INVALID_TRIGGER_PARAMETERS" ||
    error.code === "UNSUPPORTED_URL"
  ) {
    return 400
  }
  return 502
}

function jsonError(error: unknown): Response {
  const captureError = asCaptureError(error)
  return Response.json(
    { error: captureError.code },
    { status: errorStatus(captureError) },
  )
}

async function storedResponse(
  request: Request,
  key: string,
  store: CaptureStore,
  headers: HeadersInit,
): Promise<Response | null> {
  if (!(await store.head(key))) return null
  if (store.publicUrl) {
    return new Response(null, {
      status: 307,
      headers: { ...Object.fromEntries(new Headers(headers)), Location: await store.publicUrl(key) },
    })
  }
  const value = await store.get(key)
  if (!value) return null
  const responseHeaders = new Headers(headers)
  responseHeaders.set("Content-Type", value.mimeType)
  responseHeaders.set("Content-Length", String(value.body.byteLength))
  return new Response(request.method === "HEAD" ? null : responseBody(value.body), {
    status: 200,
    headers: responseHeaders,
  })
}

export function createCaptureHandler(
  config: CaptureHandlerConfig,
): (request: Request) => Promise<Response> {
  const headers = config.headers ?? {}
  return async request => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } })
    }
    let target: CaptureTarget | null
    try {
      target = await config.resolve(request)
    } catch (error) {
      return jsonError(error)
    }
    if (!target) return new Response(null, { status: 404 })

    try {
      if (config.store) {
        const hit = await storedResponse(request, target.key, config.store, headers)
        if (hit) return hit
      }

      const lease = config.lock
        ? await config.lock.acquire(target.key, config.lockTtlMs ?? 310_000)
        : undefined
      if (config.lock && !lease) {
        if (!config.store) {
          throw new CaptureError("UNKNOWN", "A lock requires a store for waiters")
        }
        const deadline = Date.now() + (config.waiterTimeoutMs ?? 310_000)
        while (Date.now() < deadline) {
          const hit = await storedResponse(request, target.key, config.store, headers)
          if (hit) return hit
          await sleep(config.waiterPollMs ?? 100)
        }
        throw new CaptureError("TIMEOUT", "Timed out waiting for concurrent capture")
      }

      try {
        const result = await (config.captureFn ?? capture)({
          ...target.captureOptions,
          url: target.url,
          settings: target.settings,
          browser: config.browser,
        })
        const value = config.postprocess
          ? await config.postprocess(result, target)
          : {
              body: new Uint8Array(result.image),
              mimeType: result.mimeType,
            }
        if (config.store) {
          await config.store.put(target.key, value)
          const response = await storedResponse(request, target.key, config.store, headers)
          if (response) return response
        }
        const responseHeaders = new Headers(headers)
        responseHeaders.set("Content-Type", value.mimeType)
        responseHeaders.set("Content-Length", String(value.body.byteLength))
        return new Response(request.method === "HEAD" ? null : responseBody(value.body), {
          status: 200,
          headers: responseHeaders,
        })
      } finally {
        if (lease && config.lock) await config.lock.release(lease)
      }
    } catch (error) {
      return jsonError(error)
    }
  }
}
