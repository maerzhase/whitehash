import type { Browser } from "puppeteer-core"

export interface BrowserProvider {
  acquire(): Promise<Browser>
  release(browser: Browser): Promise<void>
}

export const CONTAINER_CHROME_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
] as const

export function isBrowserProvider(value: BrowserProvider | Browser): value is BrowserProvider {
  return typeof (value as BrowserProvider).acquire === "function"
}
