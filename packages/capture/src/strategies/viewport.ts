import type { Page } from "puppeteer-core"

export async function captureViewport(page: Page): Promise<Buffer> {
  return Buffer.from(await page.screenshot({ type: "png" }))
}
