// Draws the banners and badges of the Creator kit (public/creator-kit/banner/): dark slanted plates with the LEGACY-X "L", in the style of the owner's sheet,
// each in a plain version (white and grey) and a violet one. Transparent PNGs at twice their size, plus manifest.json for the website.
//   PLAYWRIGHT_PATH=<path to playwright> node scripts/make-creator-banners.mjs     (then run scripts/make-creator-kit.mjs once more for the zip)
// The "L" is the mark traced into two vector paths from the 128 px picture (see legacyxxx-backend/remotion/src/Mark.tsx); the Discord glyph is the one the site uses.
import { createRequire } from "node:module"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH ?? "playwright")
const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const out = join(root, "public", "creator-kit", "banner")
mkdirSync(out, { recursive: true })

const STEM = "M319.0 64.0 L313.0 64.0 L298.0 74.0 L135.0 208.0 L114.0 230.0 L96.0 264.0 L91.0 305.0 L92.0 910.0 L97.0 917.0 L106.0 914.0 L296.0 733.0 L309.0 715.0 L319.0 691.0 L323.0 669.0 L324.0 144.0 L323.0 70.0 Z"
const BASE = "M123.0 963.0 L132.0 967.0 L626.0 967.0 L654.0 962.0 L694.0 945.0 L715.0 931.0 L909.0 763.0 L922.0 746.0 L919.0 742.0 L910.0 740.0 L403.0 741.0 L383.0 745.0 L358.0 756.0 L327.0 779.0 L134.0 946.0 L123.0 958.0 Z"
const DISCORD = "M20.32 4.37A19.79 19.79 0 0 0 15.43 2.9a.07.07 0 0 0-.07.04c-.21.37-.44.85-.6 1.23a18.27 18.27 0 0 0-5.49 0c-.16-.39-.39-.86-.61-1.23a.07.07 0 0 0-.07-.04c-1.7.29-3.31.8-4.82 1.47a.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 5.99 3.03.07.07 0 0 0 .08-.03c.46-.63.87-1.29 1.22-1.99a.07.07 0 0 0-.04-.1c-.65-.25-1.27-.55-1.87-.89a.07.07 0 0 1-.01-.12l.15-.12a.07.07 0 0 1 .07-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .07.01l.15.12a.07.07 0 0 1-.01.12c-.6.34-1.22.64-1.87.89a.07.07 0 0 0-.04.1c.36.7.78 1.36 1.22 1.99a.07.07 0 0 0 .08.03 19.84 19.84 0 0 0 6-3.03.07.07 0 0 0 .03-.05c.5-5.18-.84-9.67-3.55-13.66a.07.07 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42z"

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,500;0,700;1,500;1,700&display=block" rel="stylesheet">`
const SLANT = 34 // how far the ends lean, in px

const ACCENT = { mono: { line: "#d4d4d4", soft: "#8a8a8a", hot: "#fafafa", bar: "#e5e5e5" }, violet: { line: "#a78bfa", soft: "#6d4fc4", hot: "#c4b5fd", bar: "#8b5cf6" } }

/** The "L" as an inline SVG of `size` px. */
const mark = (size, color = "#fafafa") => `<svg viewBox="0 0 1024 1024" width="${size}" height="${size}" style="display:block"><path d="${STEM}" fill="${color}"/><path d="${BASE}" fill="${color}"/></svg>`

/** The slanted plate: a dark body with a thin light edge and a few parallel strokes at the right end. */
const plate = (w, h, a, { left = 0, accentEdge = true } = {}) => {
  const s = SLANT
  const pts = `${s},1 ${w - 1},1 ${w - s},${h - 1} 1,${h - 1}`
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position:absolute;inset:0">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1b1b"/><stop offset="1" stop-color="#090909"/></linearGradient></defs>
    <polygon points="${pts}" fill="url(#g)" stroke="${a.soft}" stroke-opacity=".55" stroke-width="2"/>
    <polyline points="${w - s - 22},${h - 7} ${w - 22},7" fill="none" stroke="${a.line}" stroke-opacity=".28" stroke-width="2"/>
    <polyline points="${w - s - 40},${h - 7} ${w - 40},7" fill="none" stroke="${a.line}" stroke-opacity=".16" stroke-width="2"/>
    ${left ? `<polygon points="${s},1 ${left + s * 0.35},1 ${left - s * 0.65},${h - 1} 1,${h - 1}" fill="#050505" />${accentEdge ? `<line x1="${left + s * 0.35}" y1="1" x2="${left - s * 0.65}" y2="${h - 1}" stroke="${a.bar}" stroke-width="4"/>` : ""}` : ""}
  </svg>`
}

const text = (value, { x, y, size, weight = 700, spacing = 0, color = "#fafafa", italic = false, width, align = "left" }) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;${width ? `width:${width}px;` : ""}text-align:${align};font-family:'Exo 2',sans-serif;font-weight:${weight};font-style:${italic ? "italic" : "normal"};font-size:${size}px;letter-spacing:${spacing}em;line-height:1;color:${color};white-space:nowrap">${value}</div>`

/** One design: its size and a function that lays out what is on the plate for an accent. */
const DESIGNS = [
  { id: "community-large", name: "Counter Strike 2 Community", w: 980, h: 200, left: 190, draw: (a, w, h) => `${plate(w, h, a, { left: 190 })}<div style="position:absolute;left:52px;top:${(h - 108) / 2}px">${mark(108)}</div>
      ${text("COUNTER STRIKE <span style='font-weight:500'>2</span>", { x: 235, y: 34, size: 62, italic: true, spacing: 0.02 })}
      <div style="position:absolute;left:300px;top:118px;width:520px;height:46px;background:linear-gradient(180deg,#f2f2f2,#9a9a9a);clip-path:polygon(20px 0,100% 0,calc(100% - 20px) 100%,0 100%)"></div>
      ${text("COMMUNITY", { x: 300, y: 130, size: 24, weight: 700, spacing: 0.55, color: "#101010", width: 520, align: "center", italic: true })}` },
  { id: "mongolian-community", name: "Mongolian CS2 Community", w: 960, h: 210, left: 190, draw: (a, w, h) => `${plate(w, h, a, { left: 190 })}<div style="position:absolute;left:52px;top:${(h - 108) / 2}px">${mark(108)}</div>
      ${text("MONGOLIAN", { x: 235, y: 30, size: 20, weight: 500, spacing: 0.4, color: "#bdbdbd" })}
      ${text("CS2 COMMUNITY", { x: 235, y: 62, size: 64, italic: true, spacing: 0.02 })}
      ${text("PLAY &nbsp;/&nbsp; COMPETE &nbsp;/&nbsp; CONNECT", { x: 240, y: 156, size: 17, weight: 500, spacing: 0.3, color: a.hot })}` },
  { id: "competitive-network", name: "CS2 Competitive Network", w: 720, h: 130, left: 0, draw: (a, w, h) => `${plate(w, h, a)}
      ${text("CS2", { x: 70, y: 22, size: 88, italic: true, spacing: 0.01 })}
      <div style="position:absolute;left:285px;top:24px;width:3px;height:82px;background:${a.line};opacity:.7;transform:skewX(-18deg)"></div>
      ${text("COMPETITIVE", { x: 330, y: 36, size: 22, weight: 500, spacing: 0.34 })}
      ${text("NETWORK", { x: 330, y: 72, size: 22, weight: 500, spacing: 0.34 })}` },
  { id: "powered-by", name: "Powered by LEGACY-X", w: 520, h: 130, left: 120, draw: (a, w, h) => `${plate(w, h, a, { left: 120 })}<div style="position:absolute;left:30px;top:${(h - 70) / 2}px">${mark(70)}</div>
      ${text("POWERED BY", { x: 160, y: 34, size: 15, weight: 500, spacing: 0.34, color: "#bdbdbd" })}
      ${text("LEGACY-X", { x: 160, y: 58, size: 40, italic: true, spacing: 0.1 })}` },
  { id: "mongolia", name: "CS2 Mongolia", w: 560, h: 100, left: 0, draw: (a, w, h) => `${plate(w, h, a)}
      <div style="position:absolute;left:62px;top:${(h - 44) / 2}px">${mark(44)}</div>
      ${text("CS2", { x: 130, y: 24, size: 56, italic: true })}
      <div style="position:absolute;left:262px;top:20px;width:3px;height:58px;background:${a.line};opacity:.7;transform:skewX(-18deg)"></div>
      ${text("MONGOLIA", { x: 300, y: 38, size: 24, weight: 500, spacing: 0.32 })}` },
  { id: "legacyx", name: "LEGACY-X", w: 560, h: 110, left: 130, draw: (a, w, h) => `${plate(w, h, a, { left: 130 })}<div style="position:absolute;left:34px;top:${(h - 62) / 2}px">${mark(62)}</div>
      ${text("LEGACY-X", { x: 175, y: 36, size: 40, spacing: 0.22 })}` },
  { id: "watch-learn-improve", name: "Watch / Learn / Improve", w: 700, h: 100, left: 0, draw: (a, w, h) => `${plate(w, h, a)}
      <svg viewBox="0 0 24 24" width="38" height="38" style="position:absolute;left:78px;top:${(h - 38) / 2}px"><path d="M6 3.5v17l14-8.5z" fill="#fafafa"/></svg>
      <div style="position:absolute;left:150px;top:18px;width:3px;height:64px;background:${a.line};opacity:.6;transform:skewX(-18deg)"></div>
      ${text("WATCH &nbsp;/&nbsp; LEARN &nbsp;/&nbsp; IMPROVE", { x: 190, y: 40, size: 21, weight: 500, spacing: 0.26 })}` },
  { id: "tagline", name: "Play. Compete. Connect.", w: 720, h: 110, left: 0, draw: (a, w, h) => `${plate(w, h, a)}
      ${text("PLAY. COMPETE. CONNECT.", { x: 70, y: 38, size: 32, italic: true, spacing: 0.08 })}
      <div style="position:absolute;right:30px;top:0;width:110px;height:${h}px;clip-path:polygon(30px 0,100% 0,calc(100% - 30px) 100%,0 100%);background:linear-gradient(135deg,#f2f2f2,#8f8f8f)"></div>
      <div style="position:absolute;right:62px;top:${(h - 54) / 2}px">${mark(54, "#0c0c0c")}</div>` },
  { id: "cs2-community", name: "CS2 Community", w: 620, h: 100, left: 0, draw: (a, w, h) => `${plate(w, h, a)}
      <div style="position:absolute;left:62px;top:${(h - 40) / 2}px">${mark(40)}</div>
      ${text("CS2", { x: 140, y: 26, size: 52, italic: true })}
      ${text("COMMUNITY", { x: 290, y: 38, size: 22, weight: 500, spacing: 0.34, color: a.hot })}` },
  { id: "esports-ecosystem", name: "LEGACY-X Esports Ecosystem", w: 700, h: 150, left: 0, draw: (a, w, h) => `${plate(w, h, a)}
      ${text("LEGACY-X", { x: 0, y: 32, size: 58, italic: true, spacing: 0.14, width: w, align: "center" })}
      ${text("ESPORTS ECOSYSTEM", { x: 0, y: 102, size: 17, weight: 500, spacing: 0.5, color: a.hot, width: w, align: "center" })}` },
  { id: "more-than-a-community", name: "LEGACY-X More than a community", w: 900, h: 170, left: 0, draw: (a, w, h) => `${plate(w, h, a)}
      <div style="position:absolute;left:120px;top:${(h - 76) / 2}px">${mark(76)}</div>
      <div style="position:absolute;left:238px;top:30px;width:3px;height:${h - 60}px;background:${a.line};opacity:.7"></div>
      ${text("LEGACY-X", { x: 290, y: 48, size: 52, spacing: 0.24 })}
      ${text("MORE THAN A COMMUNITY", { x: 292, y: 112, size: 15, weight: 500, spacing: 0.42, color: "#bdbdbd" })}` },
  { id: "team-ct", name: "Counter Strike 2, Counter-Terrorists", w: 560, h: 66, left: 0, draw: (a, w, h) => `${plate(w, h, a)}
      <div style="position:absolute;left:0;top:0;width:34px;height:${h}px;clip-path:polygon(0 0,100% 0,0 100%);background:#3b82f6"></div>
      ${text("COUNTER STRIKE <span style='font-weight:500'>2</span>", { x: 0, y: 22, size: 22, weight: 500, spacing: 0.3, width: w, align: "center" })}` },
  { id: "team-t", name: "Counter Strike 2, Terrorists", w: 560, h: 66, left: 0, draw: (a, w, h) => `${plate(w, h, a)}
      <div style="position:absolute;left:0;top:0;width:34px;height:${h}px;clip-path:polygon(0 0,100% 0,0 100%);background:#ef4444"></div>
      ${text("COUNTER STRIKE <span style='font-weight:500'>2</span>", { x: 0, y: 22, size: 22, weight: 500, spacing: 0.3, width: w, align: "center" })}` },
  { id: "discord", name: "Join our Discord", w: 440, h: 76, left: 0, draw: (a, w, h) => `${plate(w, h, a)}
      <svg viewBox="0 0 24 24" width="38" height="38" style="position:absolute;left:62px;top:${(h - 38) / 2}px"><path d="${DISCORD}" fill="#fafafa"/></svg>
      ${text("JOIN OUR DISCORD", { x: 124, y: 18, size: 13, weight: 500, spacing: 0.3, color: "#bdbdbd" })}
      ${text("LEGACY-X", { x: 124, y: 38, size: 22, spacing: 0.12 })}` },
  { id: "legacyx-compact", name: "LEGACY-X compact", w: 380, h: 70, left: 100, draw: (a, w, h) => `${plate(w, h, a, { left: 100 })}<div style="position:absolute;left:28px;top:${(h - 40) / 2}px">${mark(40)}</div>
      ${text("LEGACY-X", { x: 140, y: 24, size: 24, spacing: 0.2 })}` },
  { id: "badge-l", name: "L badge", w: 160, h: 160, plain: true, draw: (a, w, h) => `<svg width="${w}" height="${h}" viewBox="0 0 160 160" style="position:absolute;inset:0"><defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1b1b"/><stop offset="1" stop-color="#090909"/></linearGradient></defs><polygon points="46,4 114,4 156,46 156,114 114,156 46,156 4,114 4,46" fill="url(#g2)" stroke="${a.line}" stroke-opacity=".75" stroke-width="3"/></svg>
      <div style="position:absolute;left:36px;top:36px">${mark(88)}</div>` },
  { id: "badge-cs2", name: "CS2 tile", w: 200, h: 100, plain: true, draw: (a, w, h) => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position:absolute;inset:0"><defs><linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1b1b"/><stop offset="1" stop-color="#090909"/></linearGradient></defs><rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="10" fill="url(#g3)" stroke="${a.line}" stroke-opacity=".6" stroke-width="2"/><rect x="2" y="${h - 9}" width="${w - 4}" height="5" fill="${a.bar}" opacity=".9"/></svg>
      ${text("CS2", { x: 0, y: 14, size: 64, italic: true, width: w, align: "center" })}` },
  { id: "stripes", name: "Slanted stripes", w: 220, h: 80, plain: true, draw: (a) => `<div style="position:absolute;left:10px;top:6px;width:70px;height:68px;transform:skewX(-30deg);background:linear-gradient(180deg,#f2f2f2,#8f8f8f)"></div><div style="position:absolute;left:92px;top:6px;width:70px;height:68px;transform:skewX(-30deg);background:linear-gradient(180deg,${a.bar},${a.soft})"></div><div style="position:absolute;left:174px;top:6px;width:26px;height:68px;transform:skewX(-30deg);background:#101010;border:2px solid ${a.soft}"></div>` },
]

const browser = await chromium.launch()
const manifest = []
for (const design of DESIGNS) {
  for (const accent of ["mono", "violet"]) {
    const a = ACCENT[accent]
    const html = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>*{box-sizing:border-box;margin:0}html,body{background:transparent;width:${design.w}px;height:${design.h}px;overflow:hidden}</style></head><body><div style="position:relative;width:${design.w}px;height:${design.h}px">${design.draw(a, design.w, design.h)}</div></body></html>`
    const page = await browser.newPage({ viewport: { width: design.w, height: design.h }, deviceScaleFactor: 2 })
    await page.setContent(html, { waitUntil: "networkidle" })
    await page.evaluate(() => document.fonts.ready)
    const file = `${design.id}-${accent}.png`
    await page.screenshot({ path: join(out, file), omitBackground: true, clip: { x: 0, y: 0, width: design.w, height: design.h } })
    await page.close()
    manifest.push({ file: `banner/${file}`, name: `${design.name} (${accent === "mono" ? "grey" : "violet"})`, size: `${design.w * 2} × ${design.h * 2}`, accent })
    console.log("wrote", file)
  }
}
await browser.close()
writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 1))
