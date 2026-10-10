import { useCallback, useEffect, useRef, useState, type HTMLAttributes } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A row that scrolls sideways without a scrollbar: an arrow shows at each end that has more to see, the mouse wheel moves it, and a finger drags it.
 * Everything else (role, aria-label, spacing) goes on the row itself.
 */
export function ScrollRow({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const row = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState({ left: false, right: false })

  const measure = useCallback(() => {
    const node = row.current
    if (!node) return
    setMore({ left: node.scrollLeft > 4, right: node.scrollLeft + node.clientWidth < node.scrollWidth - 4 })
  }, [])

  useEffect(() => {
    measure()
    const node = row.current
    if (!node) return
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    for (const child of Array.from(node.children)) observer.observe(child)
    return () => observer.disconnect()
  }, [measure, children])

  const slide = (direction: -1 | 1) => row.current?.scrollBy({ left: direction * Math.max(160, (row.current?.clientWidth ?? 0) * 0.7), behavior: "smooth" })

  const arrow = "absolute top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)] shadow-sm transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]"
  return (
    <div className="relative">
      <div
        ref={row}
        onScroll={measure}
        onWheel={(event) => { if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) event.currentTarget.scrollLeft += event.deltaY }}
        className={cn("scrollbar-hidden flex overflow-x-auto", className)}
        {...rest}
      >
        {children}
      </div>
      {more.left && <button type="button" tabIndex={-1} aria-label="Scroll left" onClick={() => slide(-1)} className={cn(arrow, "left-1.5")}><ChevronLeft className="size-4" aria-hidden="true" /></button>}
      {more.right && <button type="button" tabIndex={-1} aria-label="Scroll right" onClick={() => slide(1)} className={cn(arrow, "right-1.5")}><ChevronRight className="size-4" aria-hidden="true" /></button>}
    </div>
  )
}
