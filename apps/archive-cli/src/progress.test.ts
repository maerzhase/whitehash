import { describe, expect, it } from "vitest"
import { createProgressReporter, type ProgressWriter } from "./progress.js"

/** Carriage return + the ANSI erase-line sequence the reporter emits. */
const CLEARED = "\r\u001b[2K"

function fakeStream(options: { isTTY?: boolean; columns?: number } = {}) {
  const chunks: string[] = []
  const stream: ProgressWriter = {
    write: chunk => {
      chunks.push(chunk)
    },
    ...options,
  }
  return { stream, chunks }
}

describe("createProgressReporter", () => {
  it("writes one line per message when output is not a terminal", () => {
    const { stream, chunks } = fakeStream()
    const reporter = createProgressReporter(stream)
    reporter.report("orders: batch 1/2")
    reporter.report("orders: batch 2/2")
    reporter.done()
    expect(chunks).toEqual(["orders: batch 1/2\n", "orders: batch 2/2\n"])
  })

  it("rewrites a single line on a terminal and clears it when done", () => {
    const { stream, chunks } = fakeStream({ isTTY: true, columns: 40 })
    const reporter = createProgressReporter(stream)
    reporter.report("orders: batch 1/2")
    reporter.report("orders: batch 2/2")
    reporter.done()
    expect(chunks).toEqual([`${CLEARED}orders: batch 1/2`, `${CLEARED}orders: batch 2/2`, CLEARED])
    expect(chunks.join("")).not.toContain("\n")
  })

  it("collapses whitespace and truncates to the terminal width", () => {
    const { stream, chunks } = fakeStream({ isTTY: true, columns: 24 })
    createProgressReporter(stream).report("  orders:   batch 100 of 400  ")
    // 24 columns leave room for 23 visible characters, ellipsis included.
    expect(chunks[0]).toBe(`${CLEARED}orders: batch 100 of 4…`)
  })

  it("falls back to a sane width when the terminal reports none", () => {
    const { stream, chunks } = fakeStream({ isTTY: true, columns: 0 })
    createProgressReporter(stream).report("closes: batch 12/20 · 2195 event(s)")
    expect(chunks[0]).toBe(`${CLEARED}closes: batch 12/20 · 2195 event(s)`)
  })

  it("does not clear a line that was never written", () => {
    const { stream, chunks } = fakeStream({ isTTY: true })
    createProgressReporter(stream).done()
    expect(chunks).toEqual([])
  })
})
