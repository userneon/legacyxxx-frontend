/**
 * LEGACY-X page building blocks shared by Home, Leaders, Penalties and Skinchanger: the same stat
 * tiles, toolbar and segmented controls everywhere.
 */
import type { ComponentType } from "react"

import { cn } from "@/lib/utils"
import { AnimatedNumber } from "@/components/animated-number"

type IconComponent = ComponentType<{ className?: string }>

/** Number tile: tinted icon, animated value and a label. */
export function StatTile({ icon: Icon, label, value, tone, suffix, pulse, fallback }: {
  icon: IconComponent
  label: string
  value: number | null | undefined
  tone: string
  suffix?: string
  /** A live dot while the value is above zero. */
  pulse?: boolean
  fallback?: string
}) {
  return (
    <div className="glass relative min-w-[8.5rem] shrink-0 snap-start overflow-hidden rounded-2xl p-3.5 hover-lift @4xl:min-w-0 @4xl:p-4">
      <div className="flex items-center justify-between">
        <span className={cn("flex size-8 items-center justify-center rounded-lg bg-white/[0.05]", tone)}><Icon className="size-4" /></span>
        {pulse && Boolean(value) && <span className="penalty-active-dot size-2 rounded-full bg-emerald-300" />}
      </div>
      <div className={cn("mt-3 text-2xl font-bold tabular-nums", tone)}><AnimatedNumber value={value} suffix={suffix} fallback={fallback} /></div>
      <div className="mt-0.5 truncate text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

/** Search on the left, page controls on the right. */
export const toolbarClass = "glass flex flex-col gap-3 rounded-2xl p-3 @2xl:flex-row @2xl:items-center @2xl:justify-between"
/** The same toolbar pinned under the header; a denser surface keeps it readable over the content. */
export const stickyToolbarClass = "glass-strong sticky top-[4.25rem] z-20 flex flex-col gap-3 rounded-2xl p-3 @2xl:flex-row @2xl:items-center @2xl:justify-between"
/** Search field inside a toolbar. */
export const toolbarSearchClass = "flex h-9 w-full items-center gap-2 rounded-lg border border-white/10 bg-background/40 px-3 transition-colors focus-within:border-white/25 @2xl:max-w-xs"

/** Segmented control (sort, filter, team): a tray with a raised active item. */
export const segmentGroupClass = "scrollbar-hidden relative inline-flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-secondary/30 p-1"
export function segmentItemClass(active: boolean) {
  return cn(
    "relative z-10 flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors",
    active ? "bg-secondary text-foreground shadow-sm" : "text-foreground/60 hover:text-foreground",
  )
}
