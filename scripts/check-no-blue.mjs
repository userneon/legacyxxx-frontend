/**
 * The LEGACY-X palette is neutral with a white accent (design spec §2): no blue, purple,
 * yellow or orange UI chrome. Fails on any hex or hsl colour in src/** whose hue lands in
 * those ranges, and on Tailwind colour families that are those hues by definition.
 *
 * Official CS2 rarity and team colours and third-party brand colours (Steam, Discord)
 * are game and brand assets rather than chrome: mark those lines `palette-exempt`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const ROOT = "src"
const HEX = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g
const HSL = /hsla?\(\s*(-?\d+(?:\.\d+)?)/g
/** Tailwind families that are blue by definition; a name alone is enough to fail. */
const BLUE_CLASSES = /\b(?:text|bg|border|ring|from|via|to|fill|stroke|shadow|outline|decoration|accent|caret|divide)-(?:blue|sky|indigo|violet|cyan|slate|zinc|gray|purple|fuchsia|pink|amber|yellow|orange|lime)-\d{2,3}\b/g

function hueOfHex(hex) {
  const full = hex.length === 4 ? hex.slice(1).split("").map((c) => c + c).join("") : hex.slice(1)
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(full.slice(index, index + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return null // grey: no hue
  const delta = max - min
  // Near-grey values (dark neutrals) carry no meaningful hue.
  if (delta < 0.04) return null
  let hue
  if (max === r) hue = ((g - b) / delta) % 6
  else if (max === g) hue = (b - r) / delta + 2
  else hue = (r - g) / delta + 4
  return (hue * 60 + 360) % 360
}

function* files(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) yield* files(path)
    else if (/\.(tsx?|css)$/.test(entry)) yield path
  }
}

/** Blue/purple (180-340 deg) and yellow/orange (25-70 deg); status green and neutrals pass. */
const forbiddenHue = (hue) => (hue >= 180 && hue <= 340) || (hue >= 25 && hue <= 70)

/** Lines carrying a game or brand colour, exempt by design. */
const EXEMPT = /palette-exempt|rarity/i

/** A file whose whole job is a game palette (e.g. lib/cs2-rarity.ts). */
const EXEMPT_FILE = /rarity/i

const problems = []
for (const file of files(ROOT)) {
  if (EXEMPT_FILE.test(file)) continue
  const text = readFileSync(file, "utf8")
  text.split("\n").forEach((line, index) => {
    if (EXEMPT.test(line)) return
    const report = (value, why) => problems.push(`${file}:${index + 1}  ${value}  (${why})`)
    for (const [hex] of line.matchAll(HEX)) {
      const hue = hueOfHex(hex)
      if (hue !== null && forbiddenHue(hue)) report(hex, `hue ${Math.round(hue)}°`)
    }
    for (const [, hue] of line.matchAll(HSL)) {
      const value = ((Number(hue) % 360) + 360) % 360
      if (forbiddenHue(value)) report(`hsl(${hue})`, `hue ${Math.round(value)}°`)
    }
    for (const [cls] of line.matchAll(BLUE_CLASSES)) report(cls, "hue colour class")
  })
}

if (problems.length > 0) {
  console.error(`check:colors failed — ${problems.length} off-palette value(s) in ${ROOT}:`)
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}
console.log("check:colors passed — no blue, purple, yellow or orange in src")
