import { useLayoutEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  /** Small count shown after the label (e.g. penalties per type). */
  count?: number
  disabled?: boolean
}

/**
 * Segmented control with a sliding thumb: the selection glides to the chosen option (200ms)
 * instead of swapping colours. Used for sort, filter and tab switches across the site.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = "md",
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: SegmentOption<T>[]
  ariaLabel: string
  size?: "sm" | "md"
  className?: string
}) {
  const container = useRef<HTMLDivElement>(null)
  const buttons = useRef(new Map<T, HTMLButtonElement>())
  const [thumb, setThumb] = useState<{ x: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const node = buttons.current.get(value)
      if (node) setThumb({ x: node.offsetLeft, width: node.offsetWidth })
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (container.current) observer.observe(container.current)
    return () => observer.disconnect()
  }, [value, options.length])

  return (
    <div
      ref={container}
      role="tablist"
      aria-label={ariaLabel}
      className={cn("relative flex shrink-0 gap-0.5 rounded-[10px] border border-[var(--line)] bg-[var(--card-surface)] p-[3px]", className)}
    >
      {thumb && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-[3px] bottom-[3px] rounded-[7px] bg-[var(--line)] transition-[transform,width] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(${thumb.x}px)`, width: thumb.width }}
        />
      )}
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
              "relative z-[1] inline-flex items-center gap-1.5 rounded-[7px] font-medium transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 disabled:opacity-50",
              size === "sm" ? "h-7 px-3 text-xs" : "h-[30px] px-3 text-[13px]",
              active ? "text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cn("text-[11px] tabular-nums", active ? "text-[var(--text-muted)]" : "text-[var(--text-dim)]")}>{option.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
