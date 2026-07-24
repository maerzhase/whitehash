# @whitehash/capture

Framework-neutral, fxhash-compatible artwork captures in headless Chromium. Given an artwork URL
and capture settings, it returns a PNG or GIF plus filtered fxhash features. Browser provisioning,
storage, request deduplication, and image post-processing are replaceable modules.

## Install

```sh
pnpm add @whitehash/capture puppeteer-core
```

Install only the optional integrations you use:

```sh
pnpm add @sparticuz/chromium-min # Vercel/Lambda Chromium
pnpm add gifenc                  # GIF captures
pnpm add sharp                   # thumbnails and GIF stills
pnpm add @aws-sdk/client-s3      # S3/R2 stores
```

## Capture

```ts
import { writeFile } from "node:fs/promises"
import {
  capture,
  CaptureMode,
  CaptureTriggerMode,
} from "@whitehash/capture"
import { localProvider } from "@whitehash/capture/browser/local"

const result = await capture({
  url: "https://art.example/token?preview=1&fxcontext=capture",
  settings: {
    mode: CaptureMode.VIEWPORT,
    resolution: { x: 1024, y: 1024 },
    triggerMode: CaptureTriggerMode.FN_TRIGGER,
  },
  browser: localProvider({ useGl: "egl" }),
  allowlist: ["https://art.example/"],
})

await writeFile("capture.png", result.image)
console.log(result.features, result.triggeredBy, result.timing)
```

`VIEWPORT` screenshots the exact requested viewport at `deviceScaleFactor: 1`. `CANVAS` uses the
canvas's intrinsic pixel dimensions:

```ts
const result = await capture({
  url,
  browser,
  settings: {
    mode: CaptureMode.CANVAS,
    canvasSelector: "#art",
    triggerMode: CaptureTriggerMode.DELAY,
    delay: 1_000,
  },
  maxDimension: 4096,
  maxImageBytes: 20_000_000,
})
```

### Artwork contract

For `FN_TRIGGER`, the artwork must signal readiness by either dispatching a window
`fxhash-preview` event or writing exactly `FXPREVIEW` to the console. Existing `fxpreview()` /
`$fx.preview()` implementations do this. Listeners are installed before navigation, so a signal
fired immediately while the document loads is retained.

The engine does not build iteration URLs. The caller supplies `preview=1`, `fxcontext=capture`,
`fxhash`, `fxminter`, `fxiteration`, `fxparams`, and any other project inputs on the URL.

Feature extraction checks `window.$fx._features` first, then `window.$fxhashFeatures`. Only
string, number, and boolean values are returned. Feature extraction failure never fails an image.

`FN_TRIGGER_GIF` captures one frame per readiness signal. Other GIF trigger modes space frames by
`captureInterval`. GIFs require the optional `gifenc` peer:

```ts
settings: {
  mode: CaptureMode.VIEWPORT,
  resolution: { x: 800, y: 800 },
  triggerMode: CaptureTriggerMode.FN_TRIGGER_GIF,
  gif: true,
  frameCount: 24,
  playbackFps: 12,
}
```

## Browser providers

Local Chrome discovery checks `CHROME_PATH`, `PUPPETEER_EXECUTABLE_PATH`, `PATH`, and common
macOS/Linux/Windows install paths:

```ts
import { localProvider } from "@whitehash/capture/browser/local"
const browser = localProvider({ useGl: "egl" })
```

For Vercel or Lambda, host the Sparticuz Chromium pack somewhere close to the function:

```ts
import { sparticuzProvider } from "@whitehash/capture/browser/sparticuz"
const browser = sparticuzProvider({
  packUrl: process.env.CHROMIUM_PACK_URL,
  useGl: "egl",
})
```

For browserless or another isolated browser service:

```ts
import { remoteProvider } from "@whitehash/capture/browser/remote"
const browser = remoteProvider({ browserWSEndpoint: process.env.BROWSER_WS_URL! })
```

Providers may pool browsers by implementing `BrowserProvider`. Every capture still creates a fresh
page. Passing a `Browser` directly transfers lifecycle ownership for that call: it is closed in a
`finally`.

## Web-standard handler

`createCaptureHandler` consumes and returns web `Request`/`Response` objects. A resolver keeps URL
construction and cache keys in application code:

```ts
import { createCaptureHandler } from "@whitehash/capture"
import { memoryLock } from "@whitehash/capture/lock/memory"
import { r2Store } from "@whitehash/capture/store/r2"

const handler = createCaptureHandler({
  browser,
  resolve: async request => {
    const hash = new URL(request.url).searchParams.get("hash")
    return hash ? { key: `captures/v1/${hash}.png`, url: artworkUrl(hash), settings } : null
  },
  store: r2Store({ client: r2, bucket: "captures", publicBaseUrl: cdn }),
  lock: memoryLock(),
  headers: { "Cache-Control": "public, max-age=31536000, immutable" },
})
```

A store hit redirects to `publicUrl` when available, otherwise streams stored bytes. Concurrent
misses share a per-key lock; waiters poll the store until the holder writes the result. `HEAD`,
validation/capture error JSON, and status mapping are built in.

### Next.js

```ts
import { toNextRouteHandler } from "@whitehash/capture/adapters/next"
export const runtime = "nodejs"
export const maxDuration = 300
export const { GET, HEAD } = toNextRouteHandler(handler)
```

### Hono

```ts
import { toHono } from "@whitehash/capture/adapters/hono"
app.get("/capture/:key", toHono(handler))
```

### Express

```ts
import { toExpress } from "@whitehash/capture/adapters/express"
app.use("/capture", toExpress(handler))
```

Memory and filesystem stores are included. `s3Store` and `r2Store` use the S3 client. Memory and
Redis locks are included; the Redis adapter accepts any client implementing node-redis-compatible
`set` and `eval` methods.

## Post-processing

```ts
import {
  makeThumbnail,
  gifMiddleFrameStill,
} from "@whitehash/capture/postprocess"

const thumbnail = await makeThumbnail(result.image) // PNG, 300×300 inside
const { image, thumbnail: gifThumb } = await gifMiddleFrameStill(result.image)
```

## Errors and security

Errors are `CaptureError` instances with stable codes:

`UNKNOWN`, `HTTP_ERROR`, `MISSING_PARAMETERS`, `INVALID_TRIGGER_PARAMETERS`,
`INVALID_PARAMETERS`, `UNSUPPORTED_URL`, `CANVAS_CAPTURE_FAILED`, `TIMEOUT`,
`EXTRACT_FEATURES_FAILED`.

Always configure `allowlist` for public endpoints. A browser can reach internal network services,
and the default container arguments include `--no-sandbox`; do not run untrusted artwork beside
sensitive workloads. Prefer a separately isolated remote browser for arbitrary user code.

Navigation must return exactly HTTP 200. Redirects may be followed, but their final response must
be 200. The trigger wait defaults to five minutes and navigation to 200 seconds. Set
`useFallbackCaptureOnTimeout` only when a best-effort image is acceptable.

Canvas readback can fail for a tainted canvas, and WebGL canvases created with
`preserveDrawingBuffer: false` may read back black. Both are browser constraints; use `VIEWPORT`
capture as the artist-facing workaround. Large intrinsic canvases should be bounded with
`maxDimension` and `maxImageBytes`. `CUSTOM` capture mode is intentionally rejected server-side.
