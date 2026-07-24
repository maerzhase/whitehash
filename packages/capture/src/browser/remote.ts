import puppeteer, { type Browser, type ConnectOptions } from "puppeteer-core"
import type { BrowserProvider } from "./provider.js"

export interface RemoteProviderOptions
  extends Omit<ConnectOptions, "browserWSEndpoint"> {
  browserWSEndpoint: string
}

export function remoteProvider(options: RemoteProviderOptions): BrowserProvider {
  return {
    acquire: () => puppeteer.connect({ acceptInsecureCerts: true, ...options }),
    release: async (browser: Browser) => {
      await browser.disconnect()
    },
  }
}
