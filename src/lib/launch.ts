/**
 * Until the launch date every visitor, on every address, sees the countdown page instead of the site
 * (see `LaunchCountdown`). The gate makes no API call and needs no sign-in; it lifts by itself at launch.
 */
export const LAUNCH_AT = Date.parse("2026-12-01T00:00:00+08:00") // 1 December, Ulaanbaatar time

const PREVIEW_KEY = "legacyx_launch_preview"

export function launchGateActive(now = Date.now()): boolean {
  if (now >= LAUNCH_AT) return false
  const params = new URLSearchParams(window.location.search)
  // A dev server shows the real site; `?countdown` shows the gate there.
  if (import.meta.env.DEV) return params.has("countdown")
  // The team opens `?preview` once to look at the site before launch; the browser remembers it.
  try {
    if (params.has("preview")) window.localStorage.setItem(PREVIEW_KEY, "1")
    if (window.localStorage.getItem(PREVIEW_KEY) === "1") return false
  } catch {
    // Storage blocked: the gate simply stays on.
  }
  return true
}
