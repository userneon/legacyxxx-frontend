#!/usr/bin/env node
/**
 * Fails when src/** uses a blue-family color (hue 180–270°) or a blue/blue-gray Tailwind palette class.
 * Legacy-X UI chrome is neutral; the only exceptions are the CS2 rank and rarity tokens in src/index.css
 * (--rank-* and --rarity-*), which appear only inside rank emblems/names and as the thin rarity bar on skins.
 * Usage: npm run check:colors
 */
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "src")
const EXTENSIONS = new Set([".ts", ".tsx", ".css", ".svg", ".html"])
const ALLOWED_LINE = /^\s*--(?:rank|rarity)-[a-z-]+:\s*#[0-9a-f]{6};/i
const PALETTE = /\b(?:bg|text|border|ring|from|via|to|fill|stroke|outline|shadow|accent|decoration|caret|divide|placeholder)-(?:blue|sky|indigo|cyan|slate|gray|zinc|violet|purple)-\d{2,3}\b/g
const HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi
const RGB = /rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/gi
const HSL = /hsla?\(\s*(-?\d+(?:\.\d+)?)(?:deg)?[\s,]+(\d+(?:\.\d+)?)%/gi

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (EXTENSIONS.has(path.extname(entry.name))) yield full
  }
}

/** Hue in degrees and HSL saturation (0–1) of an sRGB color. */
function hueAndSaturation(r, g, b) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  if (delta === 0) return { hue: 0, saturation: 0 }
  const lightness = (max + min) / 2
  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  let hue = max === rn ? ((gn - bn) / delta) % 6 : max === gn ? (bn - rn) / delta + 2 : (rn - gn) / delta + 4
  hue *= 60
  if (hue < 0) hue += 360
  return { hue, saturation }
}

function hexToRgb(hex) {
  let value = hex.slice(1)
  if (value.length <= 4) value = [...value].map((char) => char + char).join("")
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16))
}

// Near-gray colors have a meaningless hue; anything with visible saturation in the blue band is flagged.
const isBlue = (hue, saturation) => saturation >= 0.08 && hue >= 180 && hue <= 270

const problems = []
for await (const file of walk(ROOT)) {
  const lines = (await readFile(file, "utf8")).split("\n")
  lines.forEach((line, index) => {
    if (ALLOWED_LINE.test(line)) return
    const where = `${path.relative(path.dirname(ROOT), file)}:${index + 1}`
    for (const match of line.matchAll(PALETTE)) problems.push(`${where}  ${match[0]}`)
    for (const match of line.matchAll(HEX)) {
      const { hue, saturation } = hueAndSaturation(...hexToRgb(match[0]))
      if (isBlue(hue, saturation)) problems.push(`${where}  ${match[0]} (hue ${Math.round(hue)}°)`)
    }
    for (const match of line.matchAll(RGB)) {
      const { hue, saturation } = hueAndSaturation(Number(match[1]), Number(match[2]), Number(match[3]))
      if (isBlue(hue, saturation)) problems.push(`${where}  ${match[0]}) (hue ${Math.round(hue)}°)`)
    }
    for (const match of line.matchAll(HSL)) {
      const hue = ((Number(match[1]) % 360) + 360) % 360
      if (isBlue(hue, Number(match[2]) / 100)) problems.push(`${where}  ${match[0]} (hue ${Math.round(hue)}°)`)
    }
  })
}

if (problems.length) {
  console.error(`check:colors — ${problems.length} blue-family color(s) in src/:\n${problems.map((problem) => `  ${problem}`).join("\n")}`)
  process.exit(1)
}
console.log("check:colors — no blue-family colors in src/")
