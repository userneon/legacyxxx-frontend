import { useLayoutEffect, useRef } from "react"

/**
 * Lets the items of a list glide to their new places when the list re-orders or filters, instead of jumping.
 * `axis` is "x" for a row of items. Mark each item with `data-flip="<stable id>"`, put the returned ref on the list's container and pass a string that
 * changes whenever the order or content changes. Items that were already there slide from where they were;
 * items that are new simply appear (their own entrance animation, if any, plays).
 */
export function useFlip<T extends HTMLElement>(order: string, axis: "x" | "y" = "y") {
  const container = useRef<T>(null)
  const before = useRef<Map<string, number>>(new Map())

  useLayoutEffect(() => {
    const root = container.current
    if (!root) return
    const next = new Map<string, number>()
    root.querySelectorAll<HTMLElement>("[data-flip]").forEach((element) => {
      const key = element.dataset.flip!
      const top = axis === "x" ? element.offsetLeft : element.offsetTop
      next.set(key, top)
      const was = before.current.get(key)
      if (was !== undefined && was !== top && typeof element.animate === "function") {
        element.animate([{ transform: axis === "x" ? `translateX(${was - top}px)` : `translateY(${was - top}px)` }, { transform: "none" }], { duration: 480, easing: "cubic-bezier(0.22, 1, 0.36, 1)" })
      }
    })
    before.current = next
  }, [order, axis])

  return container
}
