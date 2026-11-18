/**
 * The website's own background, behind every page (owner request 2026-11-18: "not the hero banner, the website's background, show me many").
 * ?site=violet|aurora|dusk|spotlight|grid|contour|ember|ocean|mono|ink in the address picks one and this browser keeps it (html[data-site-bg], styled in index.css).
 */
export const SITE_BGS = ["calm", "violet", "aurora", "dusk", "spotlight", "grid", "contour", "ember", "ocean", "mono", "ink"] as const
export type SiteBg = (typeof SITE_BGS)[number]

export function applySiteBg(): SiteBg {
  let pick: SiteBg = "calm"
  try {
    const asked = new URLSearchParams(window.location.search).get("site")
    if (asked && (SITE_BGS as readonly string[]).includes(asked)) { window.localStorage.setItem("lx-site-bg", asked); pick = asked as SiteBg }
    else {
      const kept = window.localStorage.getItem("lx-site-bg")
      if (kept && (SITE_BGS as readonly string[]).includes(kept)) pick = kept as SiteBg
    }
  } catch { /* no storage: the default */ }
  document.documentElement.dataset.siteBg = pick
  return pick
}

// Applied as soon as this file loads (before the router can drop ?site= from the address).
if (typeof window !== "undefined") applySiteBg()
