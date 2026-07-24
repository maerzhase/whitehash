export { ONCHFS_CACHE, ONCHFS_VIRTUAL_PATH } from "./core.js"
export { ONCHFS_WORKER_NETWORKS, type OnchfsWorkerNetwork } from "./networks.js"

export interface RegisterOnchfsWorkerOptions {
  scriptUrl?: string
  scope?: string
  timeoutMs?: number
}

export type OnchfsWorkerRegistration =
  | { supported: false; registration: null }
  | { supported: true; registration: ServiceWorkerRegistration }

/** Register the same-origin worker asset and wait until it controls this page. */
export async function registerOnchfsWorker(
  options: RegisterOnchfsWorkerOptions = {},
): Promise<OnchfsWorkerRegistration> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return { supported: false, registration: null }
  }
  const registration = await navigator.serviceWorker.register(
    options.scriptUrl ?? "/onchfs-sw.js",
    { scope: options.scope ?? "/" },
  )
  await navigator.serviceWorker.ready
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>(resolve => {
      const done = () => {
        clearTimeout(timer)
        resolve()
      }
      const timer = setTimeout(done, options.timeoutMs ?? 10_000)
      navigator.serviceWorker.addEventListener("controllerchange", done, { once: true })
    })
  }
  return { supported: true, registration }
}
