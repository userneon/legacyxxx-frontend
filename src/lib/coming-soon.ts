/**
 * "Coming soon" mode (owner request 2026-11-20): until the launch the website shows one Coming Soon page (and the Terms and Privacy pages, which the App Store and TikTok review
 * need to open). Switched on at BUILD time with COMING_SOON=true (ops/site-env.sh makes VITE_COMING_SOON of it) and off by itself at the launch time, with no new build.
 * The preview: a build with PREVIEW_KEY=<key> lets whoever opens any address with ?preview=<key> once see the real site in that browser. That key is inside the bundle, so it only keeps
 * out passers-by; it is not a password. The API and the iOS app are not touched by this.
 */
const flag = import.meta.env.VITE_COMING_SOON === "true"
const previewKey = (import.meta.env.VITE_PREVIEW_KEY ?? "").trim()

/** The launch: 2026-12-12 00:00 in Ulaanbaatar (UTC+8) (owner 2026-11-20: December 12). VITE_COMING_SOON_UNTIL (an ISO time) moves it. */
export const LAUNCH_AT = Date.parse(import.meta.env.VITE_COMING_SOON_UNTIL ?? "") || Date.parse("2026-12-11T16:00:00Z")

/** The pages that stay open while the rest is coming soon. */
export const OPEN_PATHS = ["/terms", "/privacy"]

export function comingSoonActive(now = Date.now()): boolean {
  if (!flag || now >= LAUNCH_AT) return false
  if (previewKey) {
    try {
      const given = new URL(window.location.href).searchParams.get("preview")
      if (given && given === previewKey) window.localStorage.setItem("lx-preview", previewKey)
      if (window.localStorage.getItem("lx-preview") === previewKey) return false
    } catch {
      /* a browser without storage just sees the coming soon page */
    }
  }
  return true
}

/** Days, hours, minutes and seconds left to `target` (all 0 once it has passed). */
export function timeLeft(target: number, now = Date.now()) {
  const total = Math.max(0, Math.floor((target - now) / 1000))
  return { days: Math.floor(total / 86400), hours: Math.floor((total % 86400) / 3600), minutes: Math.floor((total % 3600) / 60), seconds: total % 60 }
}
