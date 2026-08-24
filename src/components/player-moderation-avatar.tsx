import { PlayerAvatar } from "@/components/player-avatar"
import { cn } from "@/lib/utils"
import type { ModerationStatus } from "@/api/types"

const statusClass: Record<ModerationStatus, string> = {
  Banned: "ring-destructive/70",
  Muted: "ring-chart-4/70",
  Gag: "ring-chart-4/70",
  Clear: "ring-chart-2/55",
}

const dotClass: Record<ModerationStatus, string> = {
  Banned: "bg-destructive",
  Muted: "bg-chart-4",
  Gag: "bg-chart-4",
  Clear: "bg-chart-2",
}

export function PlayerModerationAvatar({ avatar, name, status = "Clear", className }: { avatar?: string; name: string; status?: ModerationStatus; className?: string }) {
  return (
    <div className={cn("relative shrink-0 rounded-lg ring-1", statusClass[status], className)} title={`Status: ${status}`}>
      <PlayerAvatar avatar={avatar} name={name} className="size-full rounded-[inherit]" />
      <span aria-label={`Status: ${status}`} className={cn("absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background", dotClass[status])} />
    </div>
  )
}
