import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Tells whether an element is on screen (or within `rootMargin` of it). Returns a ref callback to put on the
 * element and the current answer. Before the first observation, and where IntersectionObserver does not exist, it says true.
 */
export function useInView<T extends Element>(options: IntersectionObserverInit = {}): [(node: T | null) => void, boolean] {
  const [inView, setInView] = useState(true)
  const observer = useRef<IntersectionObserver | null>(null)
  const { root = null, rootMargin, threshold } = options

  useEffect(() => () => observer.current?.disconnect(), [])

  const observe = useCallback(
    (node: T | null) => {
      observer.current?.disconnect()
      observer.current = null
      if (!node || typeof IntersectionObserver === "undefined") return
      observer.current = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { root, rootMargin, threshold })
      observer.current.observe(node)
    },
    // The threshold may be an array; its contents, not its identity, decide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [root, rootMargin, JSON.stringify(threshold)],
  )

  return [observe, inView]
}
