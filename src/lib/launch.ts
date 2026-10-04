/**
 * Until the launch date every visitor, on every address, sees the countdown page instead of the site
 * (see `LaunchCountdown`). The gate makes no API call and needs no sign-in; it lifts by itself at launch.
 */
export const LAUNCH_AT = Date.parse("2026-12-01T00:00:00+08:00") // 1 December, Ulaanbaatar time

const PREVIEW_STORAGE_KEY = "legacyx_launch_preview"
/** SHA-256 of the preview key. The team opens `/?preview=<key>` once; the key itself is not in the code. */
const PREVIEW_KEY_SHA256 = "3a7436ad3aa57f07799a377a44ce4060ff871eb2e669631db122d7f9fe43c2d2"

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function launchGateActive(now = Date.now()): Promise<boolean> {
  if (now >= LAUNCH_AT) return false
  const params = new URLSearchParams(window.location.search)
  // A dev server shows the real site; `?countdown` shows the gate there.
  if (import.meta.env.DEV) return params.has("countdown")
  try {
    const given = params.get("preview")
    if (given && (await sha256Hex(given)) === PREVIEW_KEY_SHA256) window.localStorage.setItem(PREVIEW_STORAGE_KEY, "1")
    if (window.localStorage.getItem(PREVIEW_STORAGE_KEY) === "1") return false
  } catch {
    // Storage or crypto blocked: the gate simply stays on.
  }
  return true
}
