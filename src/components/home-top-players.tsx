/** Home: the top five of the competitive ladder. */
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { competitiveService } from "@/api"
import type { CompetitiveLeaderboardEntry } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { CompetitiveRankBadge } from "@/components/competitive-rank-badge"
import { PlayerAvatar } from "@/components/player-avatar"
import { Skeleton } from "@/components/ui/skeleton"

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {action && onAction && (
        <button type="button" onClick={onAction} className="group inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
          {action}
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  )
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-secondary/40 px-3 py-5 text-center text-xs text-muted-foreground">{children}</p>
}

function RowsPlaceholder({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-1.5" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => <Skeleton key={index} className="h-12 rounded-xl bg-white/[0.05]" />)}
    </div>
  )
}

/** Top five of the competitive ladder. */
export function TopPlayers({ onOpenProfile, onViewAll }: { onOpenProfile: (steamId: string) => void; onViewAll: () => void }) {
  const { data, loading } = useApiQuery<CompetitiveLeaderboardEntry[]>((signal) => competitiveService.getLeaderboard({ signal }), { queryKey: "home-top-players" })
  const top = [...(data ?? [])].sort((a, b) => a.position - b.position).slice(0, 5)
  return (
    <section className="glass rounded-2xl p-4">
      <SectionHeader title="Top players" action="Leaders" onAction={onViewAll} />
      {loading && !data ? <RowsPlaceholder rows={5} /> : top.length === 0 ? <EmptyLine>No ranked players yet.</EmptyLine> : (
        <ol className="flex flex-col gap-1">
          {top.map((player) => (
            <li key={player.user_id}>
              <button type="button" onClick={() => onOpenProfile(player.steam_id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-secondary/50">
                <span className={cn("w-5 shrink-0 text-center text-xs font-bold tabular-nums", player.position <= 3 ? "text-[var(--text)]" : "text-muted-foreground")}>{player.position}</span>
                <PlayerAvatar avatar={player.avatar} name={player.username} className="size-8 shrink-0 rounded-md text-[10px]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{player.username}</div>
                  <div className="text-[11px] tabular-nums text-muted-foreground">{player.kd_ratio.toFixed(2)} K/D · {player.wins} wins</div>
                </div>
                <CompetitiveRankBadge rankId={player.rank_id} rankName={player.rank_name} imageKey={player.rank_image_key} size={24} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
