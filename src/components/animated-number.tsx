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

/** Motion always runs in full on LEGACY-X (no reduced-motion mode). */
const prefersReducedMotion = () => false

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

const NUMBER = /\d[\d,]*(?:\.\d+)?/g

/**
 * A text with figures in it ("57%", "1.17", "150 / 150", "380 EXP") whose figures count up from zero when it appears (owner request 2026-11-17: "numbers count up").
 * The words stay as they are; each figure keeps its decimals and thousands commas. A changed text counts from what was shown.
 */
export function CountText({ value, durationMs = 1000, delayMs = 300 }: { value: string; durationMs?: number; delayMs?: number }) {
  const [shown, setShown] = useState<number>(0)
  const target = useRef(0)
  const parts = value.split(NUMBER)
  const figures = (value.match(NUMBER) ?? []).map((raw) => ({ raw, number: Number(raw.replace(/,/g, "")), decimals: raw.includes(".") ? raw.split(".")[1].length : 0, commas: raw.includes(",") }))
  const key = figures.map((figure) => figure.raw).join("|")

  useEffect(() => {
    if (figures.length === 0 || document.visibilityState === "hidden") { setShown(1); return }
    let frame = 0
    const start = performance.now() + delayMs
    setShown(0)
    const tick = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - start) / durationMs))
      setShown(1 - Math.pow(1 - t, 3))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, durationMs, delayMs])
  target.current = shown

  return (
    <>
      {parts.map((part, index) => {
        const figure = figures[index]
        if (!figure) return <span key={index}>{part}</span>
        const current = figure.number * shown
        const text = current.toLocaleString("en-US", { minimumFractionDigits: figure.decimals, maximumFractionDigits: figure.decimals, useGrouping: figure.commas })
        return <span key={index}>{part}{text}</span>
      })}
    </>
  )
}
