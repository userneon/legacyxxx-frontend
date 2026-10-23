import type { ComponentType, ReactNode } from "react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * The staff site's shared shape (owner request 2026-10-23: cards, not rows): every tab sits in one centred column,
 * lists are grids of cards, and a card is a flat outline like the rest of the site.
 */
export const STAFF_BODY = "mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-6 pb-10 pt-5 max-md:px-4"
export const STAFF_GRID = "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
export type Tone = "red" | "amber" | "green" | "sky" | "violet"

/** The card shape, with `lx-tone` so a `data-tone` on the card colours its hairline, wash and icon tile. */
export const STAFF_CARD = "lx-tone relative flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-4 transition-colors hover:border-[var(--line-strong)]"

/** A titled block: small caps title with a count on the left, controls on the right, then its content. */
export function StaffSection({ title, count, end, children, label }: { title: string; count?: number; end?: ReactNode; children: ReactNode; label?: string }) {
  return (
    <section aria-label={label ?? title} className="flex flex-col gap-3">
      <header className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2">
        <span aria-hidden="true" className="h-3 w-[3px] shrink-0 rounded-full bg-[var(--text-faint)]" />
        <h2 className="text-[13px] font-semibold text-[var(--text)]">{title}</h2>
        {count !== undefined && <span className="text-xs text-[var(--text-dim)]">{count}</span>}
        {end && <div className="ml-auto flex flex-wrap items-center gap-2">{end}</div>}
      </header>
      {children}
    </section>
  )
}

/** A square icon tile at the head of a card. */
export function CardIcon({ icon: Icon, className }: { icon: ComponentType<{ className?: string }>; className?: string }) {
  return <span aria-hidden="true" className={cn("lx-tone-icon grid size-10 shrink-0 place-items-center rounded-[10px] border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)]", className)}><Icon className="size-[18px]" /></span>
}

/** One quiet line where a list is empty. */
export function StaffEmpty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-8 text-center text-[13px] text-[var(--text-dim)]">{children}</p>
}

/** A short note on hover or keyboard focus for the control inside (a button that needs one line of explaining). */
export function Tip({ text, children, side = "top" }: { text: string; children: ReactNode; side?: "top" | "bottom" }) {
  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} sideOffset={6} className="max-w-[260px] border border-[var(--line-strong)] bg-[var(--card-surface)] text-[var(--text-2)] [--tooltip-bg:var(--card-surface)]">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
