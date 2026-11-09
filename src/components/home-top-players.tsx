/** Home: the top five of the competitive ladder. */
import { PlayerNameText } from "@/components/player-name-text"
import { NameBanner } from "@/components/name-banner"
import { PerkMark } from "@/components/perk-badge"
import { ArrowRight, RotateCcw } from "lucide-react"

import { cn } from "@/lib/utils"
import { competitiveService } from "@/api"
import type { CompetitiveLeaderboardEntry } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { CompetitiveRankBadge, rankTierColor } from "@/components/competitive-rank-badge"
import { PlayerAvatar } from "@/components/player-avatar"
import { nameProps } from "@/lib/cosmetics"
import { Skeleton } from "@/components/ui/skeleton"
import { RankMedal } from "@/components/home-bento"

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

/** Row grid: place (a medal for the first three), player, rank with its emblem, EXP with its bar and the latest change. */
const ROW = "grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 @xl:grid-cols-[30px_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.2fr)] @3xl:gap-4"

function Place({ position }: { position: number }) {
  if (position >= 1 && position <= 3) return <span className="flex justify-center"><RankMedal place={position as 1 | 2 | 3} size={28} /></span>
  return <span className="text-center text-[15px] font-semibold leading-none text-[var(--text-faint)]">{position}</span>
}

/** Top five of the competitive ladder. */
export function TopPlayers({ onOpenProfile, onViewAll, className }: { onOpenProfile: (steamId: string) => void; onViewAll: () => void; className?: string }) {
  const { data, loading, error, refetch } = useApiQuery<CompetitiveLeaderboardEntry[]>((signal) => competitiveService.getLeaderboard({ signal }), { queryKey: "home-top-players" })
  const top = [...(data ?? [])].sort((a, b) => a.position - b.position).slice(0, 5)
  const topExp = Math.max(1, ...top.map((player) => player.current_exp))
  return (
    <section className={cn("lx-glass @container flex flex-col rounded-2xl p-4", className)}>
      <SectionHeader title="Top players" subtitle="by EXP" action="Leaders" onAction={onViewAll} />
      {loading && !data ? <RowsPlaceholder rows={5} /> : error && !data ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/40 px-3 py-4 text-xs text-muted-foreground">
          Could not load the ladder.
          <button type="button" onClick={refetch} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 font-medium text-[var(--text)] hover:border-[var(--line-strong)]"><RotateCcw className="size-3.5" />Retry</button>
        </div>
      ) : top.length === 0 ? <EmptyLine>No ranked players yet.</EmptyLine> : (
        <ol className="flex flex-1 flex-col">
          {top.map((player, index) => {
            const share = Math.max(4, (player.current_exp / topExp) * 100)
            // Green when the latest ranked match added EXP, red when it took some away; neutral otherwise.
            const change = player.exp_change ?? 0
            const trend = change > 0 ? "up" : change < 0 ? "down" : null
            return (
              <li key={player.user_id} className={cn("lx-row-in flex flex-1 border-t border-[var(--line-soft)] first:border-t-0")} style={{ animationDelay: `${index * 60}ms` }}>
                <button
                  type="button"
                  onClick={() => onOpenProfile(player.steam_id)}
                  className={cn(
                    ROW,
                    "group relative isolate min-h-12 w-full overflow-hidden rounded-xl px-2 py-1.5 text-left transition-[background-color] duration-500 ease-[cubic-bezier(0.37,0,0.18,1)] hover:bg-[var(--raised)] hover:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50",
                  )}
                >
                  <NameBanner fx={player.banner} />
                  <Place position={player.position} />
                  <span className="flex min-w-0 items-center gap-3">
                    <PlayerAvatar avatar={player.avatar} name={player.username} frame={player.frame} frameLook={player.frame_look} className="size-9 shrink-0 text-[11px]" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span {...nameProps(player.name_style, "truncate text-sm font-semibold text-[var(--text)]")}><PlayerNameText name={player.username} /></span>
                      <PerkMark perk={player.perk} compact />
                      <span className="truncate text-[11px] font-medium @xl:hidden" style={{ color: rankTierColor(player.rank_id) }}>{player.rank_name}</span>
                    </span>
                  </span>
                  <span className="hidden min-w-0 items-center gap-2 @xl:flex">
                    <CompetitiveRankBadge rankId={player.rank_id} rankName={player.rank_name} imageKey={player.rank_image_key} size={26} />
                    <span className="truncate text-xs font-medium" style={{ color: rankTierColor(player.rank_id) }}>{player.rank_name}</span>
                  </span>
                  <span className="flex min-w-0 flex-col items-end gap-1.5 @xl:items-stretch">
                    <span className="flex items-baseline justify-end gap-2 @xl:justify-between">
                      <span className={cn("text-[13px] font-semibold", trend === "up" ? "text-[var(--status-green)]" : trend === "down" ? "text-[var(--status-red)]" : "text-[var(--text)]")}>{player.current_exp.toLocaleString()} <span className="text-[11px] font-normal text-[var(--text-dim)]">EXP</span></span>
                      {trend && (
                        <span className={cn("text-[11px] font-medium", trend === "up" ? "text-[var(--status-green)]" : "text-[var(--status-red)]")} title="EXP change in the latest ranked match">
                          {change > 0 ? "+" : "−"}{Math.abs(change)}
                        </span>
                      )}
                    </span>
                    <span className="hidden h-1.5 overflow-hidden rounded-full bg-[var(--line-soft)] @xl:block">
                      <span
                        className={cn("lx-bar-grow block h-full rounded-full", trend === "up" ? "bg-[var(--status-green)]" : trend === "down" ? "bg-[var(--status-red)]" : "bg-[var(--text-2)]")}
                        style={{ width: `${share}%`, animationDelay: `${150 + index * 60}ms` }}
                      />
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
