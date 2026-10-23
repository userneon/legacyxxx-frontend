import { BadgeCheck } from "lucide-react"

import { DiscordIcon } from "@/components/discord-strip"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * A small Discord glyph next to a name: this player linked their Discord. Only the fact is shown, never the account.
 * Hover or focus pops a small "Discord linked" card with a green tick (the tick pops in a beat later; both stop moving for reduced motion).
 */
export function DiscordLinkedMark({ linked, className }: { linked?: boolean; className?: string }) {
  if (!linked) return null
  return (
    <TooltipProvider delayDuration={80}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} role="img" aria-label="Discord linked" className={cn("inline-flex shrink-0 cursor-default items-center rounded-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50", className)}>
            <DiscordIcon className="size-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={8}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--line-strong)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text)] shadow-[0_8px_24px_rgba(0,0,0,0.5)] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] [--tooltip-bg:var(--card-surface)] motion-reduce:animate-none"
        >
          <BadgeCheck className="size-4 text-[var(--status-green)] animate-in zoom-in-50 spin-in-[-45deg] duration-500 delay-100 fill-mode-backwards motion-reduce:animate-none" aria-hidden="true" />
          Discord linked
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
