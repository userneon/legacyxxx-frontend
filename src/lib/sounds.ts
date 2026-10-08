import { getWebsitePreferences } from "@/lib/preferences"

let context: AudioContext | null = null

/**
 * The short rising chime heard when the Owner's profile opens. It is made in the browser (no audio file), lasts under
 * two seconds and stays quiet. It plays only when the player has not turned sounds off and the browser lets the page
 * make sound, which it does once the visitor has clicked or tapped anywhere on the site; otherwise nothing happens.
 */
export function playOwnerEntrance() {
  if (!getWebsitePreferences().sounds) return
  try {
    const Audio = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Audio) return
    context ??= new Audio()
    const ctx = context
    const start = () => {
      if (ctx.state !== "running") return
      const now = ctx.currentTime
      const master = ctx.createGain()
      master.gain.value = 0.11
      master.connect(ctx.destination)
      // A soft echo makes the three notes ring into each other.
      const echo = ctx.createDelay(0.5)
      echo.delayTime.value = 0.18
      const echoGain = ctx.createGain()
      echoGain.gain.value = 0.28
      master.connect(echo)
      echo.connect(echoGain)
      echoGain.connect(ctx.destination)
      // A4, E5, A5: an open fifth, then the octave.
      ;[440, 659.25, 880].forEach((frequency, index) => {
        const at = now + index * 0.16
        const tone = ctx.createOscillator()
        const level = ctx.createGain()
        tone.type = "triangle"
        tone.frequency.value = frequency
        level.gain.setValueAtTime(0.0001, at)
        level.gain.exponentialRampToValueAtTime(1, at + 0.03)
        level.gain.exponentialRampToValueAtTime(0.0001, at + (index === 2 ? 1.1 : 0.55))
        tone.connect(level)
        level.connect(master)
        tone.start(at)
        tone.stop(at + 1.2)
      })
    }
    if (ctx.state === "suspended") void ctx.resume().then(start).catch(() => {})
    else start()
  } catch {
    // No audio support or blocked: the profile simply opens in silence.
  }
}
