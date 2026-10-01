/** Home: the top five of the competitive ladder. */
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { competitiveService } from "@/api"
import type { CompetitiveLeaderboardEntry } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { CompetitiveRankBadge, rankTierColor } from "@/components/competitive-rank-badge"
import { PlayerAvatar } from "@/components/player-avatar"
import { Skeleton } from "@/components/ui/skeleton"

function SectionHeader({ title, subtitle, action, onAction }: { title: string; subtitle?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden="true" className="h-3.5 w-[3px] rounded-full bg-[var(--text-faint)]" />
        {title}
        {subtitle && <span className="text-xs font-normal text-[var(--text-dim)]">{subtitle}</span>}
      </h2>
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

/**
 * Row grid: position, player, EXP bar, then K/D, win rate and matches as the panel widens, and the
 * rank emblem. The EXP bar and stat columns fill the width instead of leaving it empty.
 */
const ROW = "grid grid-cols-[28px_minmax(0,1fr)_28px] items-center gap-3 @xl:grid-cols-[28px_minmax(170px,1fr)_minmax(140px,1.3fr)_28px] @4xl:grid-cols-[28px_minmax(190px,1fr)_minmax(180px,1.4fr)_64px_72px_72px_28px] @4xl:gap-5"
const STAT = "hidden text-right text-[13px] text-[var(--text-2)] @4xl:block"
const HEAD = "hidden text-right @4xl:block"

/** Gold, silver, bronze reading as crimson medals: #1 filled, #2 and #3 outlined. */
function Position({ position }: { position: number }) {
  if (position > 3) return <span className="w-7 text-center text-xs font-bold text-[var(--text-dim)]">{position}</span>
  return (
    <span
      className={cn(
        "flex size-7 items-center justify-center rounded-full text-xs font-bold",
        position === 1
          ? "bg-[linear-gradient(180deg,var(--brand-bright),var(--brand))] text-[var(--text)]"
          : "border border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text-2)]",
      )}
    >
      {position}
    </span>
  )
}

/** Top five of the competitive ladder. */
export function TopPlayers({ onOpenProfile, onViewAll }: { onOpenProfile: (steamId: string) => void; onViewAll: () => void }) {
  const { data, loading } = useApiQuery<CompetitiveLeaderboardEntry[]>((signal) => competitiveService.getLeaderboard({ signal }), { queryKey: "home-top-players" })
  const top = [...(data ?? [])].sort((a, b) => a.position - b.position).slice(0, 5)
  const topExp = Math.max(1, ...top.map((player) => player.current_exp))
  return (
    <section className="glass @container rounded-2xl p-4">
      <SectionHeader title="Top players" subtitle="by EXP" action="Leaders" onAction={onViewAll} />
      {loading && !data ? <RowsPlaceholder rows={5} /> : top.length === 0 ? <EmptyLine>No ranked players yet.</EmptyLine> : (
        <>
          <div className={cn(ROW, "mb-1 hidden px-2 text-[11px] font-medium text-[var(--text-dim)] @xl:grid")} aria-hidden="true">
            <span className="text-center">#</span>
            <span>Player</span>
            <span>EXP</span>
            <span className={HEAD}>K/D</span>
            <span className={HEAD}>Win rate</span>
            <span className={HEAD}>Matches</span>
            <span />
          </div>
          <ol className="flex flex-col gap-1">
            {top.map((player, index) => {
              const share = Math.max(4, (player.current_exp / topExp) * 100)
              return (
                <li key={player.user_id} className="lx-row-in" style={{ animationDelay: `${index * 60}ms` }}>
                  <button
                    type="button"
                    onClick={() => onOpenProfile(player.steam_id)}
                    className={cn(
                      ROW,
                      "group relative w-full rounded-xl px-2 py-2.5 text-left transition-[background-color] duration-500 ease-[cubic-bezier(0.37,0,0.18,1)] hover:bg-[var(--raised)] hover:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50",
                      player.position === 1 && "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--brand)_9%,transparent),transparent_55%)]",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute bottom-2.5 left-0 top-2.5 w-[3px] scale-y-0 rounded-r-full bg-[var(--text-2)] opacity-0 transition-[scale,opacity] duration-500 ease-[cubic-bezier(0.37,0,0.18,1)] group-hover:scale-y-100 group-hover:opacity-100 group-hover:duration-300 group-hover:ease-[cubic-bezier(0.22,1,0.36,1)]"
                    />
                    <Position position={player.position} />
                    <span className="flex min-w-0 items-center gap-3 transition-[translate] duration-500 ease-[cubic-bezier(0.37,0,0.18,1)] group-hover:translate-x-1 group-hover:duration-300 group-hover:ease-[cubic-bezier(0.22,1,0.36,1)]">
                      <PlayerAvatar avatar={player.avatar} name={player.username} className={cn("size-9 shrink-0 rounded-[10px] text-[11px]", player.position === 1 && "ring-2 ring-[var(--line-strong)]")} />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-semibold text-[var(--text)]">{player.username}</span>
                        <span className="truncate text-[11px] font-medium" style={{ color: rankTierColor(player.rank_id) }}>
                          {player.rank_name}
                          <span className="font-normal text-[var(--text-dim)] @4xl:hidden"> · {player.kd_ratio.toFixed(2)} K/D · {player.wins} wins</span>
                        </span>
                      </span>
                    </span>
                    <span className="hidden min-w-0 flex-col gap-1.5 @xl:flex">
                      <span className="text-[13px] font-semibold text-[var(--text)]">{player.current_exp.toLocaleString()}</span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-[var(--line-soft)]">
                        <span
                          className={cn("lx-bar-grow block h-full rounded-full", player.position === 1 ? "lx-progress-fill" : "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--brand)_55%,transparent),var(--brand))]")}
                          style={{ width: `${share}%`, animationDelay: `${150 + index * 60}ms` }}
                        />
                      </span>
                    </span>
                    <span className={STAT}>{player.kd_ratio.toFixed(2)}</span>
                    <span className={STAT}>{player.matches_completed > 0 ? `${Math.round(player.win_rate * 100)}%` : "—"}</span>
                    <span className={cn(STAT, "text-[var(--text-muted)]")}>{player.matches_completed.toLocaleString()}</span>
                    <span className="lx-layer flex justify-end transition-[scale] duration-500 group-hover:scale-110">
                      <CompetitiveRankBadge rankId={player.rank_id} rankName={player.rank_name} imageKey={player.rank_image_key} size={26} />
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </section>
  )
}
