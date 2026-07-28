#!/usr/bin/env node
import { access, readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const fileArg = process.argv[2]
if (!fileArg) {
  console.error("Usage: node scripts/validate-thread.mjs <thread.md>")
  process.exit(1)
}

const threadPath = resolve(process.cwd(), fileArg)
const threadDir = dirname(threadPath)
const source = await readFile(threadPath, "utf8")
const sectionPattern =
  /^##\s+(\d+)\s*\n\n([\s\S]*?)(?=^##\s+\d+\s*$|^##\s+Posting notes\s*$|(?![\s\S]))/gm
const sections = [...source.matchAll(sectionPattern)]
const errors = []

if (sections.length === 0) errors.push("No numbered posts found.")

function weightedLength(value) {
  const urls = [...value.matchAll(/https?:\/\/[^\s)>\]]+/g)]
  let length = [...value].length
  for (const match of urls) length += 23 - [...match[0]].length
  return length
}

for (const [index, match] of sections.entries()) {
  const number = Number(match[1])
  if (number !== index + 1) errors.push(`Expected post ${index + 1}, found post ${number}.`)

  const section = match[2].trim()
  const mediaMatch = /^Media:\s*`?([^`\n]+)`?\s*$/m.exec(section)
  const altMatch = /^Alt:\s*(.+)$/m.exec(section)
  const body = section.split(/\nMedia:\s*/u, 1)[0].trim()
  const length = weightedLength(body)

  console.log(`Post ${number}: ${length}/280`)
  if (length > 280) errors.push(`Post ${number} exceeds 280 weighted characters (${length}).`)
  if (/\{\{[^}]+\}\}|\[TODO[^\]]*\]/iu.test(section)) {
    errors.push(`Post ${number} contains an unresolved placeholder.`)
  }
  if (mediaMatch && !altMatch) errors.push(`Post ${number} has media but no alt text.`)
  if (!mediaMatch && altMatch) errors.push(`Post ${number} has alt text but no media.`)
  if (mediaMatch) {
    try {
      await access(resolve(threadDir, mediaMatch[1]))
    } catch {
      errors.push(`Post ${number} references missing media: ${mediaMatch[1]}`)
    }
  }
}

try {
  const cards = await readFile(resolve(threadDir, "cards.html"), "utf8")
  const placeholders = [...new Set(cards.match(/\{\{[^}]+\}\}/gu) ?? [])]
  if (placeholders.length > 0) {
    errors.push(`cards.html contains ${placeholders.length} unresolved placeholders.`)
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error
}

if (errors.length > 0) {
  for (const error of errors) console.error(`Error: ${error}`)
  process.exit(1)
}

console.log(`Validated ${sections.length} posts.`)
