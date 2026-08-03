/**
 * Progress reporting for long-running commands.
 *
 * On an interactive terminal the latest message replaces the previous one on a
 * single line, so a multi-minute backfill shows live activity without scrolling
 * hundreds of lines. When output is piped or redirected, every message is
 * written as its own line so logs stay complete and greppable.
 */
const CLEAR_LINE = "\u001b[2K"

export interface ProgressWriter {
  write(chunk: string): void
  isTTY?: boolean
  columns?: number
}

export interface ProgressReporter {
  /** Report the current activity. */
  report(message: string): void
  /** Clear any live line before printing final output. */
  done(): void
}

export function createProgressReporter(
  stream: ProgressWriter = process.stdout,
  live = stream.isTTY === true,
): ProgressReporter {
  if (!live) {
    return {
      report: message => stream.write(`${message}\n`),
      done: () => {},
    }
  }
  let active = false
  // Some pseudo-terminals report 0 columns; treat implausible widths as unknown.
  const width = stream.columns && stream.columns >= 20 ? stream.columns : 80
  return {
    report: message => {
      const flat = message.replace(/\s+/g, " ").trim()
      const room = Math.max(8, width - 1)
      const line = flat.length > room ? `${flat.slice(0, room - 1)}…` : flat
      stream.write(`\r${CLEAR_LINE}${line}`)
      active = true
    },
    done: () => {
      if (active) stream.write(`\r${CLEAR_LINE}`)
      active = false
    },
  }
}
