import { useEffect, useRef, useState } from "react"

/**
 * Renders a long list in pages: `count` grows by `step` each time the sentinel scrolls into view, so thousands of
 * rows never render at once. Resets when `resetKey` changes.
 */
export function useIncremental(total: number, step = 100, resetKey?: unknown) {
  const [count, setCount] = useState(step)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => setCount(step), [resetKey, step])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || count >= total) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setCount((current) => Math.min(total, current + step))
    }, { rootMargin: "400px" })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [count, total, step])

  return { count: Math.min(count, total), sentinelRef, hasMore: count < total }
}
