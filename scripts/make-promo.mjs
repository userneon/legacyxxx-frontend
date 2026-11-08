// Draws the "Why LEGACY-X" poster (owner request 2026-11-08: "put our scanner, Staff panel and the rest in a picture that says we are better, make it impressive").
// 16:9 (1920x1080) and 4:5 (1080x1350), PNG, into public/promo/. Only things the platform really does are claimed, and no number is shown.
//   PLAYWRIGHT_PATH=<path to playwright> node scripts/make-promo.mjs
import { createRequire } from "node:module"
import { mkdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH ?? "playwright")
const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const out = join(root, "public", "promo")
mkdirSync(out, { recursive: true })

// The traced "L" of the mark, taken from the banner script so there is one copy of the paths.
const banners = readFileSync(join(root, "scripts", "make-creator-banners.mjs"), "utf8")
const STEM = banners.match(/const STEM = "([^"]+)"/)[1]
const BASE = banners.match(/const BASE = "([^"]+)"/)[1]
const mark = (size, color = "#fafafa") => `<svg viewBox="0 0 1024 1024" width="${size}" height="${size}"><path d="${STEM}" fill="${color}"/><path d="${BASE}" fill="${color}"/></svg>`

const icon = (d, extra = "") => `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}${extra}</svg>`
const FEATURES = [
  { key: "checker", title: "LEGACY-X Checker", line: "Тоглогчийн компьютерийг шалгаж, нуугдсан болон нэрээ хуурсан cheat-ийг илрүүлнэ. Зөвхөн уншина, юуг ч өөрчлөхгүй.", tag: "SCANNER",
    icon: icon('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M8 11h6"/>') },
  { key: "staff", title: "Staff panel", line: "Live server-ийн удирдлага, match хянах, шийтгэл, audit log нэг дор. Staff-д зориулсан тусдаа сайт.", tag: "STAFF",
    icon: icon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 14h3"/><path d="M8 17h6"/>') },
  { key: "penalty", title: "Ил тод шийтгэл", line: "Бүх ban нийтэд ил, хугацаа болон шалтгаантай. Appeal-аа Discord-оос шууд гаргана.", tag: "FAIR",
    icon: icon('<path d="M12 3v18"/><path d="M5 7h14"/><path d="m5 7-3 7a3 3 0 0 0 6 0Z"/><path d="m19 7-3 7a3 3 0 0 0 6 0Z"/>') },
  { key: "exp", title: "Нээлттэй EXP томьёо", line: "Match бүрийн дараа EXP хэрхэн тооцогдсоныг дэлгэрэнгүй харна. Нууц тооцоо байхгүй.", tag: "RANK",
    icon: icon('<path d="M3 17 9 11l4 4 8-8"/><path d="M14 7h7v7"/>') },
  { key: "skin", title: "Skinchanger ба 3D craft", line: "Sticker, charm, StatTrak-аа буун дээр чирж тавина. Тоглоомд харагддагтай ижил харагдана.", tag: "SKINS",
    icon: icon('<path d="M12 2 3 7v10l9 5 9-5V7Z"/><path d="M3 7l9 5 9-5"/><path d="M12 12v10"/>') },
  { key: "watch", title: "Match шууд үзэх", line: "Явагдаж буй match-ийг GOTV-ээр slot эзлэхгүйгээр, үнэгүй үзнэ.", tag: "LIVE",
    icon: icon('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>') },
]

const page = (w, h, wide) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,400;0,600;0,700;0,800;1,700&display=block" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
body{width:${w}px;height:${h}px;overflow:hidden;background:#07070a;font-family:"Exo 2",Inter,sans-serif;color:#fafafa;position:relative}
.glow{position:absolute;border-radius:50%;filter:blur(120px);opacity:.55}
.grid{position:absolute;inset:0;background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse at 30% 40%,#000 0%,transparent 75%)}
.slash{position:absolute;top:-10%;bottom:-10%;width:6px;background:linear-gradient(#8b5cf600,#8b5cf6aa,#8b5cf600);transform:skewX(-14deg)}
.wrap{position:absolute;inset:0;padding:${wide ? "72px 80px" : "64px 56px"};display:flex;${wide ? "gap:56px" : "flex-direction:column;gap:36px"}}
.hero{${wide ? "width:640px;flex:none;" : ""}display:flex;flex-direction:column;justify-content:${wide ? "center" : "flex-start"};gap:${wide ? 26 : 20}px}
.brand{display:flex;align-items:center;gap:16px;font-weight:700;font-size:26px;letter-spacing:6px;color:#d4d4d4}
.brand b{color:#a78bfa}
h1{font-size:${wide ? 148 : 128}px;line-height:.92;font-weight:800;font-style:italic;letter-spacing:-2px}
h1 span{color:#a78bfa;text-shadow:0 0 60px #8b5cf688}
.sub{font-size:${wide ? 30 : 28}px;line-height:1.35;color:#c4c4cc;font-weight:400;max-width:560px}
.chips{display:flex;gap:10px;flex-wrap:wrap}
.chip{font-size:15px;font-weight:700;letter-spacing:3px;padding:9px 16px;border:1px solid #ffffff2e;background:#ffffff0a;transform:skewX(-10deg)}
.chip i{display:block;transform:skewX(10deg);font-style:normal}
.cards{flex:1;display:grid;grid-template-columns:repeat(2,1fr);gap:${wide ? 18 : 16}px;align-content:center}
.card{position:relative;padding:${wide ? "22px 26px 24px" : "20px 22px"};background:linear-gradient(160deg,#17171d,#0c0c10);border:1px solid #ffffff1c;clip-path:polygon(0 0,calc(100% - 26px) 0,100% 26px,100% 100%,26px 100%,0 calc(100% - 26px));display:flex;flex-direction:column;gap:12px}
.card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(#a78bfa,#6d4fc4)}
.card.lead{background:linear-gradient(160deg,#241848,#0f0b1d);border-color:#8b5cf666}
.row{display:flex;align-items:center;gap:14px}
.ic{width:54px;height:54px;display:grid;place-items:center;background:#8b5cf622;border:1px solid #8b5cf666;color:#c4b5fd;transform:skewX(-8deg);flex:none}
.ic svg{transform:skewX(8deg)}
.tag{margin-left:auto;font-size:13px;font-weight:700;letter-spacing:3px;color:#a78bfa}
.card h3{font-size:${wide ? 27 : 26}px;font-weight:700;line-height:1.1}
.card p{font-size:${wide ? 18 : 18}px;line-height:1.4;color:#b8b8c2}
.foot{position:absolute;left:0;right:0;bottom:0;height:8px;background:linear-gradient(90deg,#8b5cf6,#a78bfa 40%,#8b5cf600)}
.url{position:absolute;${wide ? "right:80px;bottom:30px" : "left:56px;bottom:26px"};font-size:20px;letter-spacing:4px;color:#8a8a96;font-weight:600}
</style></head><body>
<div class="glow" style="width:700px;height:700px;left:-160px;top:-120px;background:#6d4fc4"></div>
<div class="glow" style="width:560px;height:560px;right:-120px;bottom:-160px;background:#4c2f9a"></div>
<div class="grid"></div>
<div class="slash" style="left:${wide ? 700 : 940}px"></div><div class="slash" style="left:${wide ? 730 : 975}px;opacity:.4"></div>
<div class="wrap">
  <div class="hero">
    <div class="brand">${mark(58)}<span>LEGACY<b>-X</b></span></div>
    <h1>Бид<br><span>илүү.</span></h1>
    <p class="sub">Монголын CS2 community-д ил тод, шударга, хамгаалалттай тоглоомыг бид өөрсдөө бүтээсэн.</p>
    <div class="chips"><span class="chip"><i>CS2</i></span><span class="chip"><i>MONGOLIA</i></span><span class="chip"><i>COMMUNITY</i></span></div>
  </div>
  <div class="cards">
    ${FEATURES.map((f, i) => `<div class="card${i < 2 ? " lead" : ""}"><div class="row"><div class="ic">${f.icon}</div><span class="tag">${f.tag}</span></div><h3>${f.title}</h3><p>${f.line}</p></div>`).join("")}
  </div>
</div>
<div class="url">LEGACYX.CC</div><div class="foot"></div>
</body></html>`

const browser = await chromium.launch(process.env.PLAYWRIGHT_BROWSER ? { executablePath: process.env.PLAYWRIGHT_BROWSER } : {})
for (const [name, w, h, wide] of [["why-legacyx-16x9", 1920, 1080, true], ["why-legacyx-4x5", 1080, 1350, false]]) {
  const tab = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  await tab.setContent(page(w, h, wide), { waitUntil: "networkidle" })
  await tab.evaluate(() => document.fonts.ready)
  await tab.screenshot({ path: join(out, `${name}.png`) })
  await tab.close()
  console.log(`wrote public/promo/${name}.png`)
}
await browser.close()
