// Draws the premium animated frames (scripts/premium-frames.html) frame by frame into a folder of PNGs:
//   node scripts/render-premium-frames.mjs <out-dir> [frames=24]
// then: python3 scripts/make-premium-frames.py <out-dir> public/frames
import { mkdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { createRequire } from "node:module"
import { pathToFileURL } from "node:url"
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH ?? "playwright")

const out = resolve(process.argv[2] ?? "premium-frames")
const count = Number(process.argv[3] ?? 24)
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(pathToFileURL(resolve("scripts/premium-frames.html")).href)
const names = await page.evaluate(() => window.names)
for (const name of names) {
  mkdirSync(join(out, name), { recursive: true })
  for (let i = 0; i < count; i++) {
    const data = await page.evaluate(([n, t]) => window.draw(n, t), [name, i / count])
    writeFileSync(join(out, name, `${String(i).padStart(3, "0")}.png`), Buffer.from(data.split(",")[1], "base64"))
  }
  console.log(name, count)
}
await browser.close()
