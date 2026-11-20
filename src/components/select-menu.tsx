import { useRef, useState, type ReactNode } from "react"
import { Check, ChevronDown } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type SelectMenuOption<T extends string> = { value: T; label: string; hint?: string }

/**
 * The site's own dropdown (owner 2026-11-20: the browser's <select> list was "static"): a button that shows the choice, a list that opens under it with the site's panel look and the
 * same motion as the Play filters, the chevron turning, the chosen row marked, arrow keys / Home / End / Escape. Use it instead of <select>.
 */
export function SelectMenu<T extends string>({ value, onChange, options, ariaLabel, className, icon, disabled, align = "start", placeholder }: {
  value: T
  onChange: (value: T) => void
  options: readonly SelectMenuOption<T>[]
  ariaLabel: string
  /** Classes of the button (size, border, radius); the default is the compact pill used in filter rows. */
  className?: string
  icon?: ReactNode
  disabled?: boolean
  align?: "start" | "center" | "end"
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const chosen = options.find((option) => option.value === value)

  const move = (event: React.KeyboardEvent) => {
    const rows = [...(list.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])]
    if (rows.length === 0) return
    const at = rows.indexOf(document.activeElement as HTMLButtonElement)
    const to = event.key === "ArrowDown" ? (at + 1) % rows.length : event.key === "ArrowUp" ? (at <= 0 ? rows.length - 1 : at - 1) : event.key === "Home" ? 0 : event.key === "End" ? rows.length - 1 : -1
    if (to < 0) return
    event.preventDefault()
    rows[to].focus()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn(
            "group inline-flex h-10 min-w-0 items-center justify-between gap-2 rounded-full border border-[var(--line-soft)] bg-transparent px-4 text-[14px] font-semibold text-[var(--text)] transition-colors hover:border-[var(--line-strong)] data-[state=open]:border-[var(--line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50 disabled:opacity-50",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">{icon}<span className="truncate">{chosen?.label ?? placeholder ?? ""}</span></span>
          <ChevronDown className="size-3.5 shrink-0 text-[var(--text-dim)] transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={8}
        onOpenAutoFocus={(event) => { event.preventDefault(); list.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus() ?? list.current?.querySelector<HTMLButtonElement>('[role="option"]')?.focus() }}
        className="max-h-[340px] w-[max(var(--radix-popover-trigger-width),200px)] overflow-y-auto rounded-xl border-[var(--line)] bg-[var(--panel)] p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.55)]"
      >
        <div ref={list} role="listbox" aria-label={ariaLabel} onKeyDown={move} className="flex flex-col gap-0.5">
          {options.map((option) => {
            const on = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => { onChange(option.value); setOpen(false) }}
                className={cn("flex h-9 items-center justify-between gap-3 rounded-lg px-2.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60", on ? "bg-[var(--line)] text-[var(--text)]" : "text-[var(--text-muted)] hover:bg-[var(--raised)] hover:text-[var(--text)] focus-visible:bg-[var(--raised)]")}
              >
                <span className="truncate">{option.label}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {option.hint && <span className="text-xs text-[var(--text-dim)]">{option.hint}</span>}
                  {on && <Check className="size-3.5" aria-hidden="true" />}
                </span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
