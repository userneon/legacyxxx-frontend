// Draws the giveaway poster (owner request 2026-11-08): the prizes of places 1-3, what to do to take part, how winners are picked. 16:9 and 4:5, PNG, into public/promo/.
// The prizes are the platform's own (paid ranks, Crystal Orb, ring frames, LX), never money; no dates are printed, only "7 days": the owner adds the dates in the post.
//   PLAYWRIGHT_PATH=<path to playwright> node scripts/make-giveaway.mjs
import { createRequire } from "node:module"
import { mkdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH ?? "playwright")
const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const out = join(root, "public", "promo")
mkdirSync(out, { recursive: true })

const banners = readFileSync(join(root, "scripts", "make-creator-banners.mjs"), "utf8")
const STEM = banners.match(/const STEM = "([^"]+)"/)[1]
const BASE = banners.match(/const BASE = "([^"]+)"/)[1]
const mark = (size) => `<svg viewBox="0 0 1024 1024" width="${size}" height="${size}"><path d="${STEM}" fill="#fafafa"/><path d="${BASE}" fill="#fafafa"/></svg>`
const dataUri = (path, type) => `data:${type};base64,${readFileSync(join(root, path)).toString("base64")}`
const emblem = { eternal: dataUri("src/assets/ranks/emblem-eternal.webp", "image/webp"), imperial: dataUri("src/assets/ranks/emblem-imperial.webp", "image/webp"), prestige: dataUri("src/assets/ranks/emblem-prestige.webp", "image/webp") }
const coin = dataUri("public/lx-coin.webp", "image/webp")

const PRIZES = [
  { place: 1, tier: "eternal", color: "#f87171", rank: "ETERNAL", days: "30 хоног", extras: ["Crystal Orb · 30 хоног", "20,000 LX"], how: "EXP-ийн өсөлтөөр хамгийн өндөр" },
  { place: 2, tier: "imperial", color: "#e5e5e5", rank: "IMPERIAL", days: "30 хоног", extras: ["Ring frame (өөрөө сонгоно)", "10,000 LX"], how: "Сугалаагаар" },
  { place: 3, tier: "prestige", color: "#d4d4d8", rank: "PRESTIGE", days: "14 хоног", extras: ["Beam frame (өөрөө сонгоно)", "5,000 LX"], how: "Сугалаагаар" },
]

const card = (p, wide) => `<div class="card p${p.place}" style="--c:${p.color}">
  <div class="place"><b>${p.place}</b><span>-р байр</span></div>
  <img class="emb" src="${emblem[p.tier]}" alt="">
  <div class="txt">
    <h3>${p.rank} <small>paid rank · ${p.days}</small></h3>
    ${p.extras.map((line, i) => `<p>${i === 1 ? `<img class="coin" src="${coin}" alt="">` : "✦ "}${line}</p>`).join("")}
    <em>${p.how}</em>
  </div>
</div>`

const page = (w, h, wide) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,400;0,600;0,700;0,800;1,700;1,800&display=block" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
body{width:${w}px;height:${h}px;overflow:hidden;background:#07070a;font-family:"Exo 2",Inter,sans-serif;color:#fafafa;position:relative}
.glow{position:absolute;border-radius:50%;filter:blur(130px);opacity:.55}
.wrap{position:absolute;inset:0;padding:${wide ? "58px 72px 64px" : "54px 54px 70px"};display:flex;${wide ? "gap:48px" : "flex-direction:column;gap:26px"}}
.hero{${wide ? "width:600px;flex:none;" : ""}display:flex;flex-direction:column;justify-content:${wide ? "center" : "flex-start"};gap:${wide ? 22 : 14}px}
.brand{display:flex;align-items:center;gap:14px;font-weight:700;font-size:24px;letter-spacing:6px;color:#d4d4d4}.brand b{color:#a3a3a3}
h1{font-size:${wide ? 132 : 118}px;line-height:.92;font-weight:800;font-style:italic;letter-spacing:-2px}
h1 span{color:#a3a3a3}
.sub{font-size:${wide ? 28 : 26}px;line-height:1.35;color:#c4c4cc;max-width:560px}
.steps{display:flex;flex-direction:column;gap:9px;margin-top:6px}
.steps div{display:flex;align-items:center;gap:12px;font-size:${wide ? 21 : 20}px;color:#e5e5ea}
.steps i{flex:none;width:30px;height:30px;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:16px;color:#0a0a0a;background:#e5e5e5;border-radius:9px}
.extra{font-size:16px;line-height:1.4;color:#8a8a96;margin-top:2px;max-width:560px}
.cards{flex:1;display:flex;flex-direction:column;gap:${wide ? 16 : 14}px;justify-content:center}
.card{position:relative;display:flex;align-items:center;gap:20px;padding:${wide ? "18px 26px" : "16px 24px"};background:linear-gradient(160deg,#17171d,#0c0c10);border:1px solid #ffffff1c;border-radius:22px;overflow:hidden}
.card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--c)}
.card.p1{background:linear-gradient(160deg,#2a1414,#100a0a);border-color:#f8717166;padding-top:${wide ? 24 : 20}px;padding-bottom:${wide ? 24 : 20}px}
.place{display:flex;flex-direction:column;align-items:center;min-width:64px;line-height:1}
.place b{font-size:${wide ? 54 : 50}px;font-weight:800;font-style:italic;color:var(--c)}.place span{font-size:13px;color:#8a8a96;margin-top:4px}
.emb{width:${wide ? 84 : 78}px;height:${wide ? 84 : 78}px;object-fit:contain;flex:none}
.card.p1 .emb{width:${wide ? 104 : 94}px;height:${wide ? 104 : 94}px}
.txt{display:flex;flex-direction:column;gap:5px;min-width:0}
h3{font-size:${wide ? 30 : 28}px;font-weight:800;letter-spacing:2px;color:var(--c)}h3 small{font-size:15px;font-weight:600;letter-spacing:.5px;color:#a3a3ad;margin-left:8px}
.txt p{font-size:${wide ? 20 : 19}px;color:#e5e5ea;display:flex;align-items:center;gap:8px}
.coin{width:22px;height:22px}
.txt em{font-style:normal;font-size:14px;color:#8a8a96;letter-spacing:.5px;margin-top:2px}
.foot{position:absolute;left:0;right:0;bottom:0;height:8px;background:linear-gradient(90deg,#e5e5e5,#737373 45%,#73737300)}
.note{position:absolute;${wide ? "left:72px;bottom:26px" : "left:54px;right:54px;bottom:24px"};font-size:14px;color:#7a7a86;letter-spacing:.3px}
.url{position:absolute;${wide ? "right:72px;bottom:24px" : "right:54px;top:62px"};font-size:20px;letter-spacing:4px;color:#8a8a96;font-weight:600}
</style></head><body>
<div class="glow" style="width:700px;height:700px;left:-200px;top:-200px;background:#3f3f46;opacity:.35"></div>
<div class="wrap">
  <div class="hero">
    <div class="brand">${mark(52)}<span>LEGACY<b>-X</b></span></div>
    <h1>GIVE<br><span>AWAY</span></h1>
    <p class="sub">7 хоногийн турш. 3 ялагч, дээр нь 4–10-р байр тус бүр 2,000 LX.</p>
    <div class="steps">
      <div><i>1</i>Discord server-т ор</div>
      <div><i>2</i>Steam-ээр нэвтэрч Discord-оо холбо</div>
      <div><i>3</i>Дор хаяж 1 ranked match тогло</div>
    </div>
    <p class="extra">Сугалааны нэмэлт эрх: найзаа creator кодтойгоор урь · постероо хуваалц · LX цэнэглэвэл 2 дахин эрх (заавал биш)</p>
  </div>
  <div class="cards">${PRIZES.map((p) => card(p, wide)).join("")}</div>
</div>
<div class="note">Үнэгүй оролцоно, цэнэглэх шаардлагагүй. Бүх шагнал нь LEGACY-X платформын шагнал (мөнгө биш). Ялагчийг ил зарлана.</div>
<div class="url">LEGACYX.CC</div><div class="foot"></div>
</body></html>`

const browser = await chromium.launch(process.env.PLAYWRIGHT_BROWSER ? { executablePath: process.env.PLAYWRIGHT_BROWSER } : {})
for (const [name, w, h, wide] of [["giveaway-16x9", 1920, 1080, true], ["giveaway-4x5", 1080, 1350, false]]) {
  const tab = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  await tab.setContent(page(w, h, wide), { waitUntil: "networkidle" })
  await tab.evaluate(() => document.fonts.ready)
  await tab.screenshot({ path: join(out, `${name}.png`) })
  await tab.close()
  console.log(`wrote public/promo/${name}.png`)
}
await browser.close()
