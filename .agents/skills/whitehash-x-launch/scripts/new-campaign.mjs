#!/usr/bin/env node
import { cp, mkdir, readdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const outputArg = process.argv[2]
if (!outputArg) {
  console.error("Usage: node scripts/new-campaign.mjs <output-directory>")
  process.exit(1)
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
const skillDir = resolve(scriptDir, "..")
const skillsDir = resolve(skillDir, "..")
const repositoryRoot = resolve(skillDir, "../../..")
const outputDir = resolve(process.cwd(), outputArg)

await mkdir(outputDir, { recursive: true })
if ((await readdir(outputDir)).length > 0) {
  console.error(`Refusing to overwrite non-empty directory: ${outputDir}`)
  process.exit(1)
}

await Promise.all([
  cp(resolve(skillsDir, "x-thread-plan/assets/thread.md"), resolve(outputDir, "thread.md")),
  cp(
    resolve(skillsDir, "whitehash-social-cards/assets/cards.html.template"),
    resolve(outputDir, "cards.html"),
  ),
  cp(resolve(repositoryRoot, "apps/docs/public/logo.png"), resolve(outputDir, "logo.png")),
])

console.log(`Created Whitehash launch campaign at ${outputDir}`)
