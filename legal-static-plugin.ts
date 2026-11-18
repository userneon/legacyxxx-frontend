import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import path from "node:path"
import type { Plugin } from "vite"

import { LEGAL_DOCS, type LegalDoc, type LegalPart } from "./src/lib/legal-content"

/**
 * After the build, writes the Terms and the Privacy policy as plain pages that need no JavaScript (owner request 2026-11-18): dist/terms/index.html,
 * dist/privacy/index.html (the site's own index.html with the text already inside #root and its own title, description and canonical link),
 * a Markdown copy of each (dist/terms.md, dist/privacy.md), plus robots.txt, sitemap.xml and llms.txt when public/ has none of its own.
 * The React app replaces the text as soon as it loads, so people see no difference.
 */
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export function legalStatic(siteUrl: string, discordInvite: string): Plugin {
  const site = siteUrl.replace(/\/+$/, "")
  const host = site.replace(/^https?:\/\//i, "").replace(/\/.*$/, "")
  const hrefOf = (href: "discord" | "privacy" | "terms") => (href === "discord" ? discordInvite : `${site}/${href}`)
  const fill = (text: string) => text.replaceAll("{site}", host)
  const html = (parts: LegalPart[]) => parts.map((part) => (typeof part === "string" ? escape(fill(part)) : "b" in part ? `<b>${escape(part.b)}</b>` : `<a href="${escape(hrefOf(part.href))}">${escape(part.a)}</a>`)).join("")
  const markdown = (parts: LegalPart[]) => parts.map((part) => (typeof part === "string" ? fill(part) : "b" in part ? `**${part.b}**` : `[${part.a}](${hrefOf(part.href)})`)).join("")

  const article = (doc: LegalDoc) =>
    `<article style="max-width:760px;margin:0 auto;padding:32px 16px;font-family:system-ui,sans-serif;line-height:1.6;color:#e8e8ec;background:#0b0b0e"><header><h1>${escape(doc.title)}</h1><p>${html(doc.intro)}</p></header>` +
    doc.sections.map((section) => `<section><h2>${escape(section.title)}</h2>${section.paragraphs.map((paragraph) => `<p>${html(paragraph)}</p>`).join("")}</section>`).join("") +
    `<footer><p><a href="${site}/">LXC home</a> · <a href="${site}/terms">Terms of service</a> · <a href="${site}/privacy">Privacy policy</a></p></footer></article>`

  const md = (doc: LegalDoc) => `# ${doc.title}\n\n${markdown(doc.intro)}\n\n` + doc.sections.map((section) => `## ${section.title}\n\n${section.paragraphs.map(markdown).join("\n\n")}\n`).join("\n") + `\nSource: ${site}/${doc.slug}\n`

  return {
    name: "legal-static",
    apply: "build",
    closeBundle() {
      const dist = path.resolve(process.cwd(), "dist")
      const indexPath = path.join(dist, "index.html")
      if (!existsSync(indexPath)) return
      const shell = readFileSync(indexPath, "utf8")
      for (const doc of LEGAL_DOCS) {
        const title = `${doc.title} | LXC`
        const canonical = `${site}/${doc.slug}`
        let page = shell
          .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`)
          .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escape(title)}">`)
          .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escape(doc.description)}">`)
          .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}">`)
          .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escape(title)}">`)
          .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escape(doc.description)}">`)
          .replace("<head>", `<head>\n    <meta name="description" content="${escape(doc.description)}">\n    <link rel="canonical" href="${canonical}">\n    <link rel="alternate" type="text/markdown" href="${canonical}.md">`)
          .replace('<div id="root"></div>', `<div id="root">${article(doc)}</div>`)
        if (!page.includes(`<div id="root">${article(doc).slice(0, 20)}`)) throw new Error(`legal-static: could not put the ${doc.slug} text into index.html`)
        page = page.replace(/<link rel="canonical"[^>]*>\s*(?=[\s\S]*<link rel="canonical")/, "")
        mkdirSync(path.join(dist, doc.slug), { recursive: true })
        writeFileSync(path.join(dist, doc.slug, "index.html"), page)
        writeFileSync(path.join(dist, `${doc.slug}.md`), md(doc))
      }
      const own = (name: string) => existsSync(path.resolve(process.cwd(), "public", name))
      if (!own("robots.txt")) writeFileSync(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n`)
      if (!own("sitemap.xml")) writeFileSync(path.join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${["", "terms", "privacy"].map((slug) => `  <url><loc>${site}/${slug}</loc></url>`).join("\n")}\n</urlset>\n`)
      if (!own("llms.txt")) {
        writeFileSync(
          path.join(dist, "llms.txt"),
          `# LXC\n\n> LXC is a community for Counter-Strike 2 players in Mongolia: ladder, game servers, shop, clans, market, an iPhone app and a Discord server. The site is a JavaScript app; its legal pages are also published as plain HTML and Markdown.\n\n## Legal\n\n` +
            LEGAL_DOCS.map((doc) => `- [${doc.title}](${site}/${doc.slug}.md): ${doc.description}`).join("\n") +
            `\n\n## Community\n\n- [Discord](${discordInvite})\n`,
        )
      }
    },
  }
}
