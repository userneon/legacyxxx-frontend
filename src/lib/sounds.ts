const MUTED_KEY = "legacyx.owner-theme-muted"

let context: AudioContext | null = null
let active: { master: GainNode; source: AudioBufferSourceNode } | null = null
let decoded: Promise<AudioBuffer> | null = null

const THEME_URL = "/audio/owner-theme.mp3"
const THEME_VOLUME = 0.35

/** Whether this visitor pressed stop on the Owner's theme before; it then waits for the play button. */
export function ownerThemeMuted() {
  try {
    return window.localStorage.getItem(MUTED_KEY) === "1"
  } catch {
    return false
  }
}

export function setOwnerThemeMuted(muted: boolean) {
  try {
    if (muted) window.localStorage.setItem(MUTED_KEY, "1")
    else window.localStorage.removeItem(MUTED_KEY)
  } catch {
    // Blocked storage: the choice only lasts for this visit.
  }
}

/** Stops the Owner's theme with a short fade so it never clicks. */
export function stopOwnerTheme() {
  if (!active || !context) return
  const { master, source } = active
  active = null
  const now = context.currentTime
  master.gain.cancelScheduledValues(now)
  master.gain.setValueAtTime(master.gain.value, now)
  master.gain.linearRampToValueAtTime(0.0001, now + 0.3)
  source.stop(now + 0.35)
}

/**
 * The Owner's theme, a song that loops until it is stopped. It is fetched only when the Owner's profile opens (about
 * 0.9 MB) and played through Web Audio so the loop has no gap. Resolves to true when it started. It does not start when
 * the browser still blocks sound (before the visitor has clicked or tapped anywhere on the site), so the play button can
 * start it on a click instead.
 */
export async function playOwnerTheme(): Promise<boolean> {
  try {
    const Audio = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Audio) return false
    context ??= new Audio()
    const ctx = context
    if (ctx.state === "suspended") await ctx.resume().catch(() => {})
    if (ctx.state !== "running") return false
    decoded ??= fetch(THEME_URL).then((response) => {
      if (!response.ok) throw new Error(`theme ${response.status}`)
      return response.arrayBuffer()
    }).then((data) => ctx.decodeAudioData(data))
    const buffer = await decoded.catch(() => {
      decoded = null
      return null
    })
    if (!buffer) return false
    stopOwnerTheme()

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const master = ctx.createGain()
    const now = ctx.currentTime
    master.gain.setValueAtTime(0.0001, now)
    master.gain.linearRampToValueAtTime(THEME_VOLUME, now + 0.8)
    source.connect(master)
    master.connect(ctx.destination)
    source.start()
    active = { master, source }
    return true
  } catch {
    return false
  }
}
