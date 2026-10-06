import { BadgeCheck } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Verified seal in the brand colour: pops in, the check draws itself and one ring spreads out and fades. It plays
 * when the badge appears (a look gets equipped, or the grid is dealt for the other side), then stays still.
 */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("lx-verified pointer-events-none relative inline-flex size-4 items-center justify-center", className)}>
      <span className="lx-verified-ring absolute inset-0 rounded-full border-2 border-[var(--brand-bright)]" />
      <BadgeCheck className="lx-verified-seal relative size-4 fill-[var(--brand-bright)] stroke-[var(--brand-on)]" strokeWidth={2} />
    </span>
  )
}
