/**
 * Segmented control with a sliding thumb (200ms) instead of an instant color swap: sort EXP / K/D / Win rate,
 * All / Bans / Mutes / Gags, T / CT, tabs.
 */
import { useLayoutEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  /** Small count after the label (e.g. penalties per type). */
  count?: number | null
  disabled?: boolean
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  size = "md",
  role = "tablist",
}: {
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
  size?: "sm" | "md"
  role?: "tablist" | "radiogroup"
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => {
      const active = list.querySelector<HTMLElement>(`[data-value="${CSS.escape(value)}"]`)
      if (active) setThumb({ left: active.offsetLeft, width: active.offsetWidth })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [value, options.length])

  const itemRole = role === "tablist" ? "tab" : "radio"

  return (
    <div
      ref={listRef}
      role={role}
      aria-label={ariaLabel}
      className={cn("relative inline-flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-[10px] border border-line bg-card p-[3px] no-scrollbar", className)}
      onKeyDown={(event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
        const enabled = options.filter((option) => !option.disabled)
        const index = enabled.findIndex((option) => option.value === value)
        const next = enabled[(index + (event.key === "ArrowRight" ? 1 : -1) + enabled.length) % enabled.length]
        if (next) {
          event.preventDefault()
          onChange(next.value)
          listRef.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(next.value)}"]`)?.focus()
        }
      }}
    >
      {thumb && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-[3px] bottom-[3px] rounded-[7px] bg-line transition-[left,width] duration-200 ease-out"
          style={{ left: thumb.left, width: thumb.width }}
        />
      )}
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role={itemRole}
            aria-selected={role === "tablist" ? active : undefined}
            aria-checked={role === "radiogroup" ? active : undefined}
            tabIndex={active ? 0 : -1}
            data-value={option.value}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 inline-flex shrink-0 items-center gap-1.5 rounded-[7px] px-3 font-medium whitespace-nowrap transition-colors duration-150 disabled:opacity-50",
              size === "sm" ? "h-7 text-xs" : "h-[30px] text-[13px]",
              active ? "text-text" : "text-text-muted hover:text-text",
            )}
          >
            {option.label}
            {option.count != null && <span className={cn("text-[11px] tabular-nums", active ? "text-text-muted" : "text-text-dim")}>{option.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
