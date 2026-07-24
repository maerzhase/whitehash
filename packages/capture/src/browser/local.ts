import { existsSync } from "node:fs"
import { delimiter, join } from "node:path"
import puppeteer, { type Browser, type LaunchOptions } from "puppeteer-core"
import { CONTAINER_CHROME_ARGS, type BrowserProvider } from "./provider.js"

const PLATFORM_PATHS: Record<NodeJS.Platform, string[]> = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  ],
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ],
  linux: ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
  aix: [],
  android: [],
  freebsd: [],
  haiku: [],
  openbsd: [],
  sunos: [],
  cygwin: [],
  netbsd: [],
}

export function findLocalChrome(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): string {
  for (const candidate of [env.CHROME_PATH, env.PUPPETEER_EXECUTABLE_PATH]) {
    if (candidate && existsSync(candidate)) return candidate
  }
  const executableNames =
    platform === "win32"
      ? ["chrome.exe", "chromium.exe"]
      : ["google-chrome", "chromium", "chromium-browser"]
  for (const directory of (env.PATH ?? "").split(delimiter)) {
    for (const executable of executableNames) {
      const candidate = join(directory, executable)
      if (existsSync(candidate)) return candidate
    }
  }
  for (const candidate of PLATFORM_PATHS[platform]) {
    if (existsSync(candidate)) return candidate
  }
  throw new Error(
    "No local Chrome/Chromium found. Set CHROME_PATH or use a remote/serverless provider.",
  )
}

export interface LocalProviderOptions extends Omit<LaunchOptions, "executablePath"> {
  executablePath?: string
  useGl?: string | false
}

export function localProvider(options: LocalProviderOptions = {}): BrowserProvider {
  const { executablePath, useGl = false, args = [], ...launchOptions } = options
  return {
    acquire: () =>
      puppeteer.launch({
        ...launchOptions,
        executablePath: executablePath ?? findLocalChrome(),
        headless: launchOptions.headless ?? true,
        args: [...CONTAINER_CHROME_ARGS, ...(useGl ? [`--use-gl=${useGl}`] : []), ...args],
        acceptInsecureCerts: true,
      }),
    release: async (browser: Browser) => {
      await browser.close()
    },
  }
}
