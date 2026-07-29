#!/usr/bin/env node
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

const fileArg = process.argv[2]
if (!fileArg) {
  console.error("Usage: node scripts/validate-copy.mjs <copy-file>")
  process.exit(1)
}

const source = await readFile(resolve(process.cwd(), fileArg), "utf8")
const errors = []
const warnings = []

if (/[—–]/u.test(source)) {
  errors.push("Copy contains an em or en dash.")
}
if (/\b(beginners?|dummy|nontechnical)\b/iu.test(source)) {
  warnings.push("Copy may label the audience instead of addressing them gently.")
}
if (/\b(revolutionary|game-changing|magic)\b/iu.test(source)) {
  warnings.push("Copy contains a discouraged hype word.")
}

for (const warning of warnings) console.warn(`Warning: ${warning}`)
if (errors.length > 0) {
  for (const error of errors) console.error(`Error: ${error}`)
  process.exit(1)
}

console.log("Whitehash voice checks passed.")
