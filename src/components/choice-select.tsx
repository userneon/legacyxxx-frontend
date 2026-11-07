import { useState } from "react"
import { Check, ChevronDown } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface Choice<T extends string | number> { value: T; label: string; hint?: string }

/**
 * A dropdown in the site's own look (the browser's own list paints the chosen row in its bright system blue, which the palette does not have): a solid panel,
 * neutral hover, a check on the chosen row, an optional hint (a price) on the right. Keyboard: Up and Down move, Enter picks, Esc closes.
 */
export function ChoiceSelect<T extends string | number>({ value, onChange, options, ariaLabel, className }: { value: T; onChange: (value: T) => void; options: Choice<T>[]; ariaLabel: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const chosen = options.find((option) => option.value === value) ?? options[0]
  const move = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
    event.preventDefault()
    const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=option]")]
    const at = items.indexOf(document.activeElement as HTMLButtonElement)
    items[(at + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus()
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} className={cn("flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 text-left text-[13px] text-[var(--text)] transition-colors hover:border-[var(--line-strong)] focus-visible:border-[var(--text-faint)] focus-visible:outline-none", className)}>
          <span className="truncate">{chosen?.label}</span>
          <ChevronDown className={cn("size-3.5 shrink-0 text-[var(--text-dim)] transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="w-[var(--radix-popover-trigger-width)] min-w-[170px] rounded-lg border-[var(--line)] bg-[var(--panel)] p-1" onKeyDown={move} onOpenAutoFocus={(event) => { event.preventDefault(); (event.currentTarget as HTMLElement).querySelector<HTMLButtonElement>("[aria-selected=true]")?.focus() }}>
        <div role="listbox" aria-label={ariaLabel} className="flex flex-col">
          {options.map((option) => {
            const on = option.value === value
            return (
              <button key={String(option.value)} type="button" role="option" aria-selected={on} onClick={() => { onChange(option.value); setOpen(false) }} className={cn("flex h-9 items-center gap-2 rounded-md px-2.5 text-left text-[13px] outline-none transition-colors hover:bg-[var(--raised)] focus-visible:bg-[var(--raised)]", on ? "text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]")}>
                <Check className={cn("size-3.5 shrink-0", on ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.hint && <span className="shrink-0 text-[12px] text-[var(--text-dim)]">{option.hint}</span>}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
