import { useEffect, useRef, useState } from "react"

interface AnimatedNumberProps {
  value: number | null | undefined
  /** Shown while the API has not provided a value yet. */
  fallback?: string
  durationMs?: number
  /** Fraction digits to render, e.g. 2 for a K/D ratio. */
  decimals?: number
  suffix?: string
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

// Counts from the previously shown value to the new one so live refreshes glide instead of jumping.
export function AnimatedNumber({ value, fallback = "—", durationMs = 900, decimals = 0, suffix = "" }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (value == null || !Number.isFinite(value)) return
    const from = fromRef.current
    // Hidden tabs pause requestAnimationFrame, which would leave the number stuck at its start value.
    if (from === value || prefersReducedMotion() || document.visibilityState === "hidden") {
      fromRef.current = value
      setDisplay(value)
      return
    }

    const factor = 10 ** decimals
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = t === 1 ? value : Math.round((from + (value - from) * eased) * factor) / factor
      fromRef.current = next
      setDisplay(next)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, durationMs, decimals])

  if (value == null || !Number.isFinite(value)) return <>{fallback}</>
  return <>{display.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>
}
