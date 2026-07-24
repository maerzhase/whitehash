import type { Browser, LaunchOptions } from "puppeteer-core"
import type { BrowserProvider } from "./provider.js"

export interface SparticuzProviderOptions
  extends Omit<LaunchOptions, "executablePath"> {
  packUrl?: string
  useGl?: string | false
}

export function sparticuzProvider(
  options: SparticuzProviderOptions = {},
): BrowserProvider {
  const { packUrl, useGl = "egl", args = [], ...launchOptions } = options
  return {
    async acquire() {
      const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
        import("@sparticuz/chromium-min"),
        import("puppeteer-core"),
      ])
      return puppeteer.launch({
        ...launchOptions,
        executablePath: await chromium.executablePath(packUrl),
        headless: "shell",
        args: [
          ...chromium.args,
          "--disable-dev-shm-usage",
          ...(useGl ? [`--use-gl=${useGl}`] : []),
          ...args,
        ],
        acceptInsecureCerts: true,
      })
    },
    async release(browser: Browser) {
      await browser.close()
    },
  }
}
