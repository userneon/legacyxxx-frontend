/**
 * The About pages (owner request 2026-11-20): the facts about LXC in six languages, for people, search engines and AI. Free of imports so the build step (about-static-plugin.ts) can load it.
 * One file per language (en.ts is the source; mn.ts is Cyrillic Mongolian and mn-latn is made from it by latinize() in index.ts). Pages and section ids are the same in every language.
 * Keep it to facts that stay true (no prices that change, no hype): an AI that reads it repeats it.
 */
export type AboutSection = { id: string; title: string; p?: string[]; li?: string[] }
export type AboutPage = { slug: string; title: string; description: string; intro: string; sections: AboutSection[] }
export type AboutUi = {
  home: string; pages: string; languages: string; copyPage: string; copyAll: string; copied: string; source: string; onThisPage: string; translated: string; contact: string; markdown: string
}
export type AboutLang = { code: string; hreflang: string; name: string; ui: AboutUi; pages: AboutPage[] }
