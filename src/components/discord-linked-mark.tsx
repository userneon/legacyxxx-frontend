import { DiscordIcon } from "@/components/discord-strip"
import { cn } from "@/lib/utils"

/** A small Discord glyph next to a name: this player linked their Discord. Only the fact is shown, never the account. */
export function DiscordLinkedMark({ linked, className }: { linked?: boolean; className?: string }) {
  if (!linked) return null
  return (
    <span title="Discord linked" role="img" aria-label="Discord linked" className={cn("inline-flex shrink-0 items-center text-[var(--text-dim)]", className)}>
      <DiscordIcon className="size-3.5" />
    </span>
  )
}
