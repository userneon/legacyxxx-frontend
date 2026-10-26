/**
 * Records the clan page effects into public/clan-fx/<effect>.gif (grey on black, ping-pong so the loop never jumps).
 * The site tints them with the clan's colour instead of running WebGL (owner request 2026-10-24: lighter pages).
 * Needs the dev server (`npm run dev`) and Playwright's Chromium; run again only when an effect's look changes.
 *   node scripts/record-clan-effects.mjs [effect…]     then     python3 scripts/make-clan-fx-gif.py
 */
import { mkdirSync } from "node:fs"
import { createRequire } from "node:module"
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH ?? "playwright")

const ALL = ["slats", "waves", "dots", "aurora", "threads", "particles", "lightning", "rays", "lines", "plasma", "starfield", "matrix", "orbs", "grid", "embers", "vortex", "hex"]
const FRAMES = 36
const STEP_MS = 110
const base = process.env.CAPTURE_URL ?? "http://localhost:5173"
const out = new URL("../.fx-frames/", import.meta.url).pathname
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] })
const page = await browser.newPage({ viewport: { width: 400, height: 225 } })
page.on("console", (message) => message.type() === "error" && console.log("  page:", message.text().slice(0, 160)))
for (const effect of process.argv.slice(2).length ? process.argv.slice(2) : ALL) {
  mkdirSync(`${out}${effect}`, { recursive: true })
  await page.goto(`${base}/capture-effects.html?effect=${effect}`)
  await page.waitForTimeout(2500)
  for (let index = 0; index < FRAMES; index += 1) {
    // The dot field only moves under a cursor, so a pointer sweeps across it while it is recorded.
    if (effect === "dots") await page.mouse.move(200 + 170 * Math.sin((index / FRAMES) * Math.PI * 2), 112 + 80 * Math.sin((index / FRAMES) * Math.PI * 4), { steps: 6 })
    await page.screenshot({ path: `${out}${effect}/${String(index).padStart(3, "0")}.png` })
    await page.waitForTimeout(STEP_MS)
  }
  console.log(`recorded ${effect}`)
}
await browser.close()
