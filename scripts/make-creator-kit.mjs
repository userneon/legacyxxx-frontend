// Draws the Creator kit (public/creator-kit/): logo wordmarks, thumbnail backgrounds, video overlays and the zip, from plain HTML in Playwright.
//   PLAYWRIGHT_PATH=<path to playwright> node scripts/make-creator-kit.mjs        (needs Playwright and Python 3 for the zip; fonts come from Google Fonts)
// The wordmark is text (Black Ops One, the site's display face) so it stays sharp at any size; the round LEGACY-X mark exists only as a 128px picture,
// so it is used small (overlays) and a high-resolution logo from the owner should replace it before it is used big.
import { createRequire } from "node:module"
import { mkdirSync, copyFileSync, writeFileSync, existsSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH ?? "playwright")
const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const out = join(root, "public", "creator-kit")
for (const d of ["logo", "thumbnail", "overlay"]) mkdirSync(join(out, d), { recursive: true })

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Exo+2:wght@500;700&display=block" rel="stylesheet">`
const CSS = `
*{box-sizing:border-box;margin:0}
:root{--bg:#0a0a0a;--brand:#8b5cf6;--bright:#a78bfa;--text:#fafafa;--dim:#a3a3a3;--line:#262626}
html,body{background:transparent;font-family:"Exo 2",system-ui,sans-serif;color:var(--text)}
.wm{font-family:"Black Ops One",system-ui,sans-serif;letter-spacing:.02em;line-height:1;white-space:nowrap}
.wm i{font-style:normal;color:var(--bright)}
.stage{position:relative;overflow:hidden}
.dark{background:var(--bg)}
.glow{position:absolute;inset:0;background:radial-gradient(60% 70% at 85% 100%,rgba(139,92,246,.55),transparent 70%),radial-gradient(40% 45% at 10% 0%,rgba(167,139,250,.18),transparent 70%)}
.glow.neutral{background:radial-gradient(60% 70% at 85% 100%,rgba(255,255,255,.14),transparent 70%)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:80px 80px;mask-image:linear-gradient(180deg,transparent,#000 40%,#000 70%,transparent)}
.beam{position:absolute;inset:0;background:repeating-linear-gradient(115deg,transparent 0 120px,rgba(255,255,255,.035) 120px 121px)}
`
const page = (w, h, body, bg = "transparent") => `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${CSS}html,body{width:${w}px;height:${h}px;background:${bg}}</style></head><body>${body}</body></html>`

const jobs = []
const add = (file, w, h, body, transparent = true, bg) => jobs.push({ file, w, h, html: page(w, h, body, bg), transparent })

// --- logo: the wordmark, three looks, transparent, 3000 px wide ---
const wm = (size, mode) => `<div class="wm" style="font-size:${size}px;color:${mode === "black" ? "#0a0a0a" : "#fafafa"}">LEGACY-<i style="color:${mode === "white" ? "#fafafa" : mode === "black" ? "#0a0a0a" : "#a78bfa"}">X</i></div>`
for (const [name, mode] of [["white", "white"], ["brand", "brand"], ["black", "black"]]) {
  add(`logo/legacyx-wordmark-${name}.png`, 3000, 700, `<div style="width:3000px;height:700px;display:flex;align-items:center;justify-content:center">${wm(420, mode)}</div>`)
}

// --- thumbnails: backgrounds with the wordmark in a corner and nothing where the creator's picture and words go ---
const thumb = (w, h, variant, left, top) => { const f = Math.round(h * 0.075); return `<div class="stage dark" style="width:${w}px;height:${h}px"><div class="glow ${variant === "neutral" ? "neutral" : ""}"></div><div class="grid"></div><div class="beam"></div>
  <div style="position:absolute;left:${left}px;top:${top}px;display:flex;align-items:center;gap:18px"><div class="wm" style="font-size:${f}px">LEGACY-<i>X</i></div></div>
  <div data-slot="by" style="position:absolute;left:${left}px;top:${top + f + Math.round(f * 0.3)}px;width:${Math.round(w * 0.7)}px;height:${Math.round(f * 0.62)}px"></div></div>` }
add("thumbnail/thumbnail-16x9-violet.png", 1280, 720, thumb(1280, 720, "violet", 44, 36), false)
add("thumbnail/thumbnail-16x9-dark.png", 1280, 720, thumb(1280, 720, "neutral", 44, 36), false)
add("thumbnail/thumbnail-9x16-violet.png", 1080, 1920, thumb(1080, 1920, "violet", 60, 70), false)
add("thumbnail/thumbnail-9x16-dark.png", 1080, 1920, thumb(1080, 1920, "neutral", 60, 70), false)

// --- overlays, 1920x1080, transparent ---
add("overlay/lower-third.png", 1920, 1080, `<div style="position:absolute;left:80px;bottom:110px;display:flex;align-items:stretch;height:120px;min-width:760px">
  <div style="width:10px;background:var(--brand)"></div>
  <div style="flex:1;background:linear-gradient(90deg,rgba(10,10,10,.92),rgba(10,10,10,.55));padding:0 36px;display:flex;flex-direction:column;justify-content:center;gap:10px;border-top:1px solid rgba(255,255,255,.12);border-bottom:1px solid rgba(255,255,255,.12)">
    <div data-slot="name" style="height:46px;width:640px"></div><div style="font-size:26px;font-weight:500;color:var(--dim);letter-spacing:.06em;text-transform:uppercase">Content Creator · <span class="wm" style="font-size:24px;color:var(--text)">LEGACY-<i>X</i></span></div></div></div>
  <div style="position:absolute;left:100px;bottom:178px;font-size:12px;color:transparent">name goes here</div>`)
add("overlay/powered-by.png", 1920, 1080, `<div style="position:absolute;right:64px;top:56px;display:flex;align-items:center;gap:16px;padding:14px 26px;background:rgba(10,10,10,.78);border:1px solid rgba(255,255,255,.14)">
  <span style="font-size:22px;font-weight:500;color:var(--dim);letter-spacing:.14em;text-transform:uppercase">Powered by</span><span class="wm" style="font-size:38px">LEGACY-<i>X</i></span></div>`)
add("overlay/creator-code.png", 1920, 1080, `<div style="position:absolute;left:50%;bottom:90px;transform:translateX(-50%);display:flex;align-items:stretch;height:96px;background:rgba(10,10,10,.85);border:1px solid rgba(255,255,255,.16)">
  <div style="display:flex;align-items:center;padding:0 34px;background:var(--brand);font-size:30px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#f5f3ff">Creator code</div>
  <div data-slot="code" style="width:360px;height:100%"></div>
  <div style="display:flex;align-items:center;padding:0 30px;border-left:1px solid rgba(255,255,255,.16)"><span class="wm" style="font-size:34px">LEGACY-<i>X</i></span></div></div>`)
add("overlay/end-card.png", 1920, 1080, `<div class="stage dark" style="width:1920px;height:1080px"><div class="glow"></div><div class="grid"></div><div class="beam"></div>
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px"><div style="font-size:34px;color:var(--dim);letter-spacing:.3em;text-transform:uppercase">Play ranked on</div><div class="wm" style="font-size:230px">LEGACY-<i>X</i></div><div style="font-size:44px;font-weight:700;letter-spacing:.06em">legacyx.cc</div><div data-slot="by" style="width:900px;height:54px"></div></div></div>`, false)

const slots = {}
const browser = await chromium.launch()
const ctx = await browser.newContext({ deviceScaleFactor: 1 })
for (const job of jobs) {
  const p = await ctx.newPage()
  await p.setViewportSize({ width: job.w, height: job.h })
  await p.setContent(job.html, { waitUntil: "networkidle" })
  await p.evaluate(() => document.fonts.ready)
  const found = await p.evaluate(() => [...document.querySelectorAll("[data-slot]")].map((el) => { const r = el.getBoundingClientRect(); return { slot: el.dataset.slot, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }))
  if (found.length) slots[job.file] = Object.fromEntries(found.map(({ slot, ...box }) => [slot, box]))
  await p.screenshot({ path: join(out, job.file), omitBackground: job.transparent, clip: { x: 0, y: 0, width: job.w, height: job.h } })
  await p.close()
  console.log("wrote", job.file)
}
await browser.close()
// Where a name or a code goes on each picture: the Creator kit on the website writes it there in the browser (src/lib/creator-kit.ts).
writeFileSync(join(out, "slots.json"), JSON.stringify(slots, null, 1))

// the round mark (the only picture of it we have is 128 px, fine for an overlay, too small for a big logo)
copyFileSync(join(root, "public", "logolegacyx.webp"), join(out, "logo", "legacyx-mark-small.webp"))

writeFileSync(join(out, "BRAND.txt"), `LEGACY-X creator kit

COLOURS
  Black      #0A0A0A   backgrounds
  Panel      #0F0F0F   boxes
  Line       #262626   thin borders
  White      #FAFAFA   text
  Violet     #8B5CF6   the brand colour, used sparingly
  Soft violet #A78BFA  the "-X" in the name, small icons

TYPE
  Name        Black Ops One (Google Fonts)   LEGACY-X, the "-X" in violet
  Everything else  Exo 2 (Google Fonts), 500 and 700

USING THE LOGO
  - Write it LEGACY-X, upper case, with the "-X" in soft violet (the brand file) or all white / all black (one colour files).
  - Leave empty space round it of at least half its height. Do not stretch, rotate, outline or add glow to it.
  - Put it on black or a dark picture. The black file is for light backgrounds only.
  - The round mark is a small picture (128 px): use it small. Ask staff for the big one.

THUMBNAILS
  16:9  1280 x 720   (YouTube)       9:16  1080 x 1920   (TikTok, Shorts, Reels)
  The wordmark sits in the top-left corner; keep your face and title away from it. Keep words inside the middle 80 percent.

READY-MADE ANIMATIONS  (video/, 1920 x 1080, transparent WebM; made by backend/remotion, the same for everyone)
  community-intro.webm   the "L" builds up, then COUNTER-STRIKE and COMMUNITY come in letter by letter (5 s)
  logo-sting.webm        the mark and LEGACY-X (4 s)
  wipe-transition.webm   a screen wipe between two clips (1.2 s)
  community-badge.webm   a corner badge that slides in from the right (5 s)
  Put them on a layer above your clip. Browsers and OBS read the transparency; if your editor shows a black box, ask staff for a MOV.

OVERLAYS  (1920 x 1080, transparent PNG, put them on a layer above the game)
  lower-third.png  name bar: type your name in the empty space above "Content Creator · LEGACY-X"
  powered-by.png   corner badge, top right
  creator-code.png your creator code: type it into the empty box (My code on the Creators page); say the code in the video too
  end-card.png     last 5 seconds: Play ranked on LEGACY-X, legacyx.cc

RULES
  - Say what it is: a Content Creator video, not an official LEGACY-X announcement, unless staff said so.
  - Do not use the kit on videos that show cheats, hate or anything that breaks the server rules.
`)

// the zip
execFileSync("python3", ["-c", `
import zipfile, os
base = ${JSON.stringify(out)}
with zipfile.ZipFile(os.path.join(base, "legacyx-creator-kit.zip"), "w", zipfile.ZIP_DEFLATED) as z:
    for folder, _, files in os.walk(base):
        for f in sorted(files):
            if f.endswith(".zip") or f == "slots.json": continue
            full = os.path.join(folder, f)
            z.write(full, os.path.relpath(full, base))
`])
console.log("zip written")
