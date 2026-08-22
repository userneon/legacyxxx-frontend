import { PlayerAvatar } from "@/components/player-avatar"
import { cn } from "@/lib/utils"
import type { ModerationStatus } from "@/api/types"

const statusClass: Record<ModerationStatus, string> = {
  Banned: "border-destructive/70 bg-destructive/10",
  Muted: "border-chart-4/70 bg-chart-4/10",
  Clear: "border-chart-2/55 bg-chart-2/10",
}

const dotClass: Record<ModerationStatus, string> = {
  Banned: "bg-destructive",
  Muted: "bg-chart-4",
  Clear: "bg-chart-2",
}

export function PlayerModerationAvatar({ avatar, name, status = "Clear", className }: { avatar?: string; name: string; status?: ModerationStatus; className?: string }) {
  return (
    <div className={cn("relative shrink-0 rounded-lg border p-0.5", statusClass[status])} title={`Status: ${status}`}>
      <PlayerAvatar avatar={avatar} name={name} className={className} />
      <span aria-label={`Status: ${status}`} className={cn("absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background", dotClass[status])} />
    </div>
  )
}
