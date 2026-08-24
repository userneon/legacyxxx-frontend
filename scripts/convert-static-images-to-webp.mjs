#!/usr/bin/env node
/**
 * Converts raster photo/static assets to WebP in bounded parallel batches.
 * Icons, logo marks, SVGs, and already-WebP assets intentionally remain untouched.
 * Usage: node scripts/convert-static-images-to-webp.mjs --root /srv/legacyx-assets --quality 84 --jobs 6 [--dry-run]
 */
import { readdir, stat, access } from "node:fs/promises"
import { constants } from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] ?? fallback : fallback
}
const root = path.resolve(option("--root", "/home/ubuntu/webdev-static-assets"))
const quality = Math.max(70, Math.min(92, Number(option("--quality", "84"))))
const jobs = Math.max(1, Math.min(24, Number(option("--jobs", "6"))))
const dryRun = args.includes("--dry-run")
const photoExtensions = new Set([".jpg", ".jpeg", ".png"])
const preservePattern = /(logo|icon|mark|favicon|sprite|emoji|flag|^(?:both|rifles|midtier|pistol|knife|gloves|pins)\.png$)/i

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? filesIn(absolute) : [absolute]
  }))
  return nested.flat()
}

function convert(input, output) {
  return new Promise((resolve, reject) => {
    const process = spawn("cwebp", ["-quiet", "-q", String(quality), input, "-o", output], { stdio: "inherit" })
    process.once("error", reject)
    process.once("close", (code) => code === 0 ? resolve() : reject(new Error(`cwebp failed (${code}) for ${input}`)))
  })
}

const candidates = (await filesIn(root)).filter((file) => photoExtensions.has(path.extname(file).toLowerCase()) && !preservePattern.test(path.basename(file)))
const queue = candidates.map((input) => ({ input, output: `${input.slice(0, -path.extname(input).length)}.webp` }))
let cursor = 0
let converted = 0
let skipped = 0

async function worker() {
  while (cursor < queue.length) {
    const current = queue[cursor++]
    try {
      await access(current.output, constants.F_OK)
      skipped += 1
      continue
    } catch { /* output does not exist */ }
    if (dryRun) {
      console.log(`would convert ${current.input} -> ${current.output}`)
      converted += 1
      continue
    }
    await convert(current.input, current.output)
    const source = await stat(current.input)
    const result = await stat(current.output)
    console.log(`converted ${path.relative(root, current.input)} -> ${path.relative(root, current.output)} (${source.size}B -> ${result.size}B)`)
    converted += 1
  }
}

await Promise.all(Array.from({ length: jobs }, worker))
console.log(JSON.stringify({ root, candidates: queue.length, converted, skipped, dryRun, quality, jobs }))
