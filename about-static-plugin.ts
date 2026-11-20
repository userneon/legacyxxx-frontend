import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

import { ABOUT_LANGS, DEFAULT_LANG, type AboutLang, type AboutPage } from "./src/lib/about"

/**
 * The About pages as plain HTML and Markdown (owner request 2026-11-20), written at build time into dist/ and dist-soon/ (legal-static-plugin.ts calls writeAbout):
 *   /<lang>/about/ and /<lang>/about/<slug>/   a page with no JavaScript needed (a few lines of script only for the copy buttons)
 *   /<lang>/about.md, /<lang>/about/<slug>.md and /<lang>/about/all.md   the same text as Markdown (all.md is everything in one file, for pasting into an AI)
 *   /about/ and /ai-document/                  send the visitor to the page in their language
 * nginx serves these files before the single-page app, so they open on the real site and on the Coming Soon site alike.
 */
const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const urlOf = (site: string, lang: AboutLang, slug: string) => `${site}/${lang.code}/about/${slug === "about" ? "" : `${slug}/`}`
const mdUrlOf = (site: string, lang: AboutLang, slug: string) => (slug === "about" ? `${site}/${lang.code}/about.md` : `${site}/${lang.code}/about/${slug}.md`)
const pathOf = (lang: AboutLang, slug: string) => (slug === "about" ? `/${lang.code}/about/` : `/${lang.code}/about/${slug}/`)

export function pageMarkdown(page: AboutPage, heading = "#"): string {
  const parts = [`${heading} ${page.title}`, page.intro]
  for (const section of page.sections) {
    parts.push(`${heading}# ${section.title}`)
    if (section.p) parts.push(...section.p)
    if (section.li) parts.push(section.li.map((item) => `- ${item}`).join("\n"))
  }
  return parts.join("\n\n")
}
const pageMd = (site: string, lang: AboutLang, page: AboutPage) => `${pageMarkdown(page)}\n\n${lang.ui.source}: ${urlOf(site, lang, page.slug)}\n`
const allMd = (site: string, lang: AboutLang) => `${lang.pages.map((page) => pageMarkdown(page)).join("\n\n---\n\n")}\n\n${lang.ui.source}: ${site}/${lang.code}/about/\n`

const CSS = `:root{color-scheme:dark light;--bg:#08090c;--card:#101218;--line:#23262f;--fg:#e8e9ee;--dim:#9a9fae;--accent:#7c8cff}
@media (prefers-color-scheme:light){:root{--bg:#f6f7fa;--card:#fff;--line:#dfe2ea;--fg:#14161c;--dim:#5b6070;--accent:#3d4fd6}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 Figtree,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--accent)}header,main,footer{max-width:820px;margin:0 auto;padding:0 16px}
header{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center;justify-content:space-between;padding-block:20px}
.brand{font-weight:800;letter-spacing:.08em;text-decoration:none;color:var(--fg)}
.langs{display:flex;flex-wrap:wrap;gap:6px}.langs a,.langs b{font-size:13px;padding:3px 10px;border:1px solid var(--line);border-radius:999px;text-decoration:none;color:var(--dim)}.langs b{color:var(--fg);border-color:var(--accent)}
h1{font-size:clamp(1.8rem,5vw,2.6rem);line-height:1.15;margin:8px 0 12px;text-wrap:balance}h2{font-size:1.35rem;margin:36px 0 8px;text-wrap:balance}h2 a{color:var(--dim);text-decoration:none;margin-left:6px;font-weight:400;opacity:.6}
.intro{font-size:1.1rem;color:var(--dim);max-width:65ch}p,li{max-width:70ch}li{margin:4px 0}
nav.pages,nav.toc{margin:20px 0;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:var(--card)}nav h3{margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim)}nav ul{margin:0;padding-left:18px}
.actions{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}button{font:inherit;font-size:14px;padding:8px 14px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer}button:hover{border-color:var(--accent)}
footer{padding-block:32px 48px;color:var(--dim);font-size:14px;border-top:1px solid var(--line);margin-top:40px}footer p{margin:6px 0}`

const SCRIPT = `(function(){function get(id){var e=document.getElementById(id);return e?e.textContent:""}
function copy(text,btn){var done=function(){var old=btn.textContent;btn.textContent=btn.getAttribute("data-done");setTimeout(function(){btn.textContent=old},1800)};
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done,function(){fallback(text,done)})}else{fallback(text,done)}}
function fallback(text,done){var t=document.createElement("textarea");t.value=text;t.style.position="fixed";t.style.opacity="0";document.body.appendChild(t);t.select();try{document.execCommand("copy");done()}catch(e){}document.body.removeChild(t)}
document.querySelectorAll("button[data-copy]").forEach(function(b){b.addEventListener("click",function(){copy(get(b.getAttribute("data-copy")),b)})})})();`

function pageHtml(site: string, discordInvite: string, lang: AboutLang, page: AboutPage): string {
  const url = urlOf(site, lang, page.slug)
  const alternates = ABOUT_LANGS.map((l) => `<link rel="alternate" hreflang="${l.hreflang}" href="${urlOf(site, l, page.slug)}">`).join("\n")
  const switcher = ABOUT_LANGS.map((l) => (l.code === lang.code ? `<b lang="${l.hreflang}">${esc(l.name)}</b>` : `<a lang="${l.hreflang}" hreflang="${l.hreflang}" href="${pathOf(l, page.slug)}">${esc(l.name)}</a>`)).join("")
  const pagesNav = lang.pages.map((p) => (p.slug === page.slug ? `<li><b>${esc(p.title)}</b></li>` : `<li><a href="${pathOf(lang, p.slug)}">${esc(p.title)}</a></li>`)).join("")
  const toc = page.sections.map((s) => `<li><a href="#${s.id}">${esc(s.title)}</a></li>`).join("")
  const body = page.sections.map((s) => `<section id="${s.id}"><h2>${esc(s.title)}<a href="#${s.id}" aria-label="#">#</a></h2>${(s.p ?? []).map((t) => `<p>${esc(t)}</p>`).join("")}${s.li ? `<ul>${s.li.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}</section>`).join("\n")
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${site}/#org`, name: "LXC", alternateName: "LEGACY-X", url: `${site}/`, sameAs: [discordInvite], description: lang.pages[0].description },
      { "@type": "WebSite", "@id": `${site}/#site`, url: `${site}/`, name: "LXC", inLanguage: lang.hreflang, publisher: { "@id": `${site}/#org` } },
      { "@type": "WebPage", "@id": `${url}#page`, url, name: page.title, description: page.description, inLanguage: lang.hreflang, isPartOf: { "@id": `${site}/#site` }, about: { "@id": `${site}/#org` } },
    ],
  }
  const mdPage = pageMd(site, lang, page)
  const mdAll = allMd(site, lang)
  const safeScript = (text: string) => text.replace(/<\/script/gi, "<\\/script")
  return `<!doctype html>
<html lang="${lang.hreflang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)} | LXC</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${url}">
${alternates}
<link rel="alternate" hreflang="x-default" href="${urlOf(site, ABOUT_LANGS.find((l) => l.code === DEFAULT_LANG) ?? lang, page.slug)}">
<link rel="alternate" type="text/markdown" href="${mdUrlOf(site, lang, page.slug)}">
<link rel="icon" type="image/png" href="/favicon.png">
<meta property="og:title" content="${esc(page.title)} | LXC">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
<meta property="og:image" content="${site}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${safeScript(JSON.stringify(ld))}</script>
<style>${CSS}</style>
</head>
<body>
<header><a class="brand" href="/">LXC</a><nav class="langs" aria-label="${esc(lang.ui.languages)}">${switcher}</nav></header>
<main>
<h1>${esc(page.title)}</h1>
<p class="intro">${esc(page.intro)}</p>
<div class="actions"><button type="button" data-copy="md-page" data-done="${esc(lang.ui.copied)}">${esc(lang.ui.copyPage)}</button><button type="button" data-copy="md-all" data-done="${esc(lang.ui.copied)}">${esc(lang.ui.copyAll)}</button></div>
<nav class="pages" aria-label="${esc(lang.ui.pages)}"><h3>${esc(lang.ui.pages)}</h3><ul>${pagesNav}</ul></nav>
<nav class="toc" aria-label="${esc(lang.ui.onThisPage)}"><h3>${esc(lang.ui.onThisPage)}</h3><ul>${toc}</ul></nav>
${body}
</main>
<footer>
<p><a href="/">${esc(lang.ui.home)}</a> · <a href="/terms">Terms of service</a> · <a href="/privacy">Privacy policy</a> · <a href="${mdUrlOf(site, lang, page.slug)}">${esc(lang.ui.markdown)}</a> · <a href="${discordInvite}">Discord</a></p>
<p>${esc(lang.ui.translated)}</p>
</footer>
<script type="text/plain" id="md-page">${safeScript(esc(mdPage))}</script>
<script type="text/plain" id="md-all">${safeScript(esc(mdAll))}</script>
<script>${SCRIPT}</script>
</body>
</html>
`
}

/** `/about/` and `/ai-document/`: the visitor goes to the page in their own language (English when unknown). Without JavaScript the links are right there. */
function redirectHtml(site: string): string {
  const en = ABOUT_LANGS.find((l) => l.code === DEFAULT_LANG)!
  const links = ABOUT_LANGS.map((l) => `<li><a href="/${l.code}/about/" hreflang="${l.hreflang}">${esc(l.name)}</a></li>`).join("")
  const map = JSON.stringify({ mn: "mn", ru: "ru", zh: "zh", ko: "ko" })
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>About LXC</title>
<meta name="description" content="${esc(en.pages[0].description)}">
<link rel="canonical" href="${urlOf(site, en, "about")}">
${ABOUT_LANGS.map((l) => `<link rel="alternate" hreflang="${l.hreflang}" href="${urlOf(site, l, "about")}">`).join("\n")}
<link rel="alternate" hreflang="x-default" href="${urlOf(site, en, "about")}">
<style>${CSS}</style>
<script>(function(){var m=${map};var l=(navigator.language||"en").slice(0,2).toLowerCase();location.replace("/"+(m[l]||"en")+"/about/")})();</script>
</head>
<body><main><h1>About LXC</h1><ul>${links}</ul></main></body>
</html>
`
}

export type AboutOutput = { urls: string[]; mdLinks: Array<{ title: string; url: string; description: string }> }

export function writeAbout(dist: string, site: string, discordInvite: string): AboutOutput {
  const put = (file: string, content: string) => {
    const target = path.join(dist, file)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, content)
  }
  const urls: string[] = []
  for (const lang of ABOUT_LANGS) {
    for (const page of lang.pages) {
      const dir = page.slug === "about" ? `${lang.code}/about` : `${lang.code}/about/${page.slug}`
      put(`${dir}/index.html`, pageHtml(site, discordInvite, lang, page))
      put(page.slug === "about" ? `${lang.code}/about.md` : `${lang.code}/about/${page.slug}.md`, pageMd(site, lang, page))
      urls.push(urlOf(site, lang, page.slug))
    }
    put(`${lang.code}/about/all.md`, allMd(site, lang))
  }
  const redirect = redirectHtml(site)
  put("about/index.html", redirect)
  put("ai-document/index.html", redirect)
  const en = ABOUT_LANGS.find((l) => l.code === DEFAULT_LANG)!
  put("llms-full.txt", `# LXC: everything in one file (English)\n\n${allMd(site, en)}`)
  return { urls, mdLinks: en.pages.map((page) => ({ title: page.title, url: mdUrlOf(site, en, page.slug), description: page.description })) }
}
