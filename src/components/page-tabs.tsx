import { useLayoutEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"
import type { SegmentOption } from "@/components/segmented"

/** The first row of a page: tabs on the left, a hint and the page's controls on the right, one hairline underneath. */
export function PageBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("shrink-0 border-b border-[var(--glass-line)] px-6", className)}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">{children}</div>
    </div>
  )
}

/** Controls that sit on the right of a {@link PageBar}. */
export function PageBarEnd({ children }: { children: ReactNode }) {
  return <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2 py-2">{children}</div>
}

/** Search field for a {@link PageBar}. */
export const pageSearchClass = "flex h-9 w-[220px] items-center gap-2 rounded-lg border border-[var(--glass-line)] px-3 transition-[border-color] duration-200 focus-within:border-[var(--text-faint)]"

/**
 * Underlined tabs: the line under the chosen tab glides to the next one. Used for the sort, type and rating
 * switches at the top of a page.
 */
export function PageTabs<T extends string>({ value, onChange, options, ariaLabel, lead }: {
  value: T
  onChange: (value: T) => void
  options: SegmentOption<T>[]
  ariaLabel: string
  /** Quiet words before the tabs, e.g. "Ranked by". */
  lead?: string
}) {
  const buttons = useRef(new Map<T, HTMLButtonElement>())
  const container = useRef<HTMLDivElement>(null)
  const [line, setLine] = useState<{ x: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const node = buttons.current.get(value)
      if (node) setLine({ x: node.offsetLeft, width: node.offsetWidth })
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (container.current) observer.observe(container.current)
    return () => observer.disconnect()
  }, [value, options.length])

  return (
    <div className="flex items-center gap-5">
      {lead && <span className="text-[13px] text-[var(--text-dim)] max-sm:hidden">{lead}</span>}
      <div ref={container} role="tablist" aria-label={ariaLabel} className="relative flex gap-6">
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              ref={(node) => {
                if (node) buttons.current.set(option.value, node)
                else buttons.current.delete(option.value)
              }}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={option.disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "inline-flex h-12 items-center gap-1.5 text-[13px] font-semibold transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 disabled:opacity-50",
                active ? "text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
            >
              {option.label}
              {option.count !== undefined && <span className="text-[11px] font-medium text-[var(--text-dim)]">{option.count}</span>}
            </button>
          )
        })}
        {line && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-px left-0 h-[2px] rounded-full bg-[var(--text)] transition-[transform,width] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ transform: `translateX(${line.x}px)`, width: line.width }}
          />
        )}
      </div>
    </div>
  )
}
