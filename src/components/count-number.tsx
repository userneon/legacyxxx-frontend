import { useEffect, useRef, useState } from "react"

/**
 * A number that counts to its new value instead of jumping (the price when a length is picked): ease-out over about 450ms, from wherever it is now.
 * Shows the final value at once for reduced motion and on the first draw.
 */
export function CountNumber({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  const now = useRef(value)
  now.current = shown
  useEffect(() => {
    if (value === now.current) return
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setShown(value); from.current = value; return }
    const start = performance.now()
    const origin = now.current
    let frame = 0
    const tick = (time: number) => {
      const t = Math.min(1, (time - start) / 450)
      const eased = 1 - (1 - t) ** 3
      setShown(Math.round(origin + (value - origin) * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
      else from.current = value
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return <span className={className}>{shown.toLocaleString()}</span>
}
