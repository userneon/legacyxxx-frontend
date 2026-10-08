const MUTED_KEY = "legacyx.owner-theme-muted"

let context: AudioContext | null = null
let active: { master: GainNode; stopAt: number; timer: number } | null = null

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
  const { master, timer } = active
  window.clearTimeout(timer)
  const now = context.currentTime
  master.gain.cancelScheduledValues(now)
  master.gain.setValueAtTime(master.gain.value, now)
  master.gain.linearRampToValueAtTime(0.0001, now + 0.25)
  active = null
}

/**
 * The Owner's theme: a slow, soft A-minor chime, made in the browser (no audio file), about six seconds. Resolves to
 * true when it started. It does not start when the browser still blocks sound (before the visitor has clicked or tapped
 * anywhere on the site), so the play button can start it on a click instead. `onEnd` runs when it finishes by itself.
 */
export async function playOwnerTheme(onEnd: () => void): Promise<boolean> {
  try {
    const Audio = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Audio) return false
    context ??= new Audio()
    const ctx = context
    if (ctx.state === "suspended") await ctx.resume().catch(() => {})
    if (ctx.state !== "running") return false
    stopOwnerTheme()

    const now = ctx.currentTime
    const master = ctx.createGain()
    master.gain.value = 0.1
    master.connect(ctx.destination)
    // A soft echo makes the notes ring into each other.
    const echo = ctx.createDelay(0.6)
    echo.delayTime.value = 0.22
    const echoGain = ctx.createGain()
    echoGain.gain.value = 0.3
    master.connect(echo)
    echo.connect(echoGain)
    echoGain.connect(ctx.destination)
    // A3, E4, A4, C5, E5, A5: a low open fifth that climbs to the octave above.
    const notes = [220, 329.63, 440, 523.25, 659.25, 880]
    notes.forEach((frequency, index) => {
      const at = now + index * 0.42
      const tone = ctx.createOscillator()
      const level = ctx.createGain()
      tone.type = "triangle"
      tone.frequency.value = frequency
      level.gain.setValueAtTime(0.0001, at)
      level.gain.exponentialRampToValueAtTime(1, at + 0.04)
      level.gain.exponentialRampToValueAtTime(0.0001, at + (index === notes.length - 1 ? 2.8 : 1.6))
      tone.connect(level)
      level.connect(master)
      tone.start(at)
      tone.stop(at + 3)
    })
    const length = notes.length * 0.42 + 2.8
    const timer = window.setTimeout(() => {
      if (active?.master === master) active = null
      onEnd()
    }, length * 1000)
    active = { master, stopAt: now + length, timer }
    return true
  } catch {
    return false
  }
}
