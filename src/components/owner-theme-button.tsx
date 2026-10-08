import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Pause, Play } from "lucide-react"

import { ownerThemeMuted, playOwnerTheme, setOwnerThemeMuted, stopOwnerTheme } from "@/lib/sounds"
import { cn } from "@/lib/utils"

/**
 * The Owner's theme on the Owner's profile. It starts by itself when the browser allows sound; the round button at the
 * bottom right stops it or plays it again. Pressing stop is remembered on this device, so the theme then waits for the
 * play button on the next visit. It is not a setting: the control lives on the page.
 */
export function OwnerThemeButton() {
  const [playing, setPlaying] = useState(false)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    if (!ownerThemeMuted()) void playOwnerTheme(() => alive.current && setPlaying(false)).then((started) => alive.current && setPlaying(started))
    return () => {
      alive.current = false
      stopOwnerTheme()
    }
  }, [])

  const toggle = async () => {
    if (playing) {
      stopOwnerTheme()
      setOwnerThemeMuted(true)
      setPlaying(false)
      return
    }
    setOwnerThemeMuted(false)
    setPlaying(await playOwnerTheme(() => alive.current && setPlaying(false)))
  }

  // In the page body: inside the animated page it would be placed against that, not against the window.
  return createPortal(
    <button
      type="button"
      onClick={() => void toggle()}
      aria-label={playing ? "Stop the Owner's theme" : "Play the Owner's theme"}
      title={playing ? "Stop" : "Play the Owner's theme"}
      className={cn(
        "fixed bottom-5 right-5 z-30 flex size-11 items-center justify-center rounded-full border bg-[var(--panel)] text-[var(--text)] shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-[border-color,background-color] duration-200 hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 max-md:bottom-4 max-md:right-4",
        playing ? "border-[var(--line-strong)]" : "border-[var(--line)]",
      )}
    >
      {playing ? <Pause className="size-[18px]" /> : <Play className="size-[18px] translate-x-px" />}
    </button>,
    document.body,
  )
}
