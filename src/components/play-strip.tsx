/**
 * The strip above a Play page (owner request 2026-11-14, a FACEIT matchmaking screenshot: three small labelled tiles in a row above the lobby):
 * your skill level and its progress, how many are playing right now, and today's EXP limit. All real numbers from the API; a tile whose data is missing is left out.
 */

import { competitiveService, serversService } from "@/api"
import { profileOverviewService } from "@/api/profile-overview"
import type { CompetitiveProfile, HomeStats } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { CompetitiveRankBadge, rankTierColor } from "@/components/competitive-rank-badge"
import { cn } from "@/lib/utils"

const pct = (part: number, whole: number) => (whole > 0 ? Math.max(0, Math.min(100, (part / whole) * 100)) : 0)

function Tile({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="px-0.5 text-[11px] font-medium text-[var(--text-muted)]">{label}</span>
      <div className={cn("lx-glass flex min-h-[84px] min-w-0 flex-col justify-center gap-2 px-4 py-3", className)}>{children}</div>
    </div>
  )
}

export function PlayStrip() {
  const { user } = useAuth()
  const { data: profile } = useApiQuery<CompetitiveProfile>((signal) => competitiveService.getPlayer(user!.id, { signal }), { enabled: Boolean(user?.id), queryKey: `home-rank:${user?.id ?? "guest"}` })
  const { data: overview } = useApiQuery((signal) => profileOverviewService.get(user!.id, { signal }), { enabled: Boolean(user?.id), queryKey: `home-rank-limits:${user?.id ?? "guest"}` })
  const { data: stats } = useApiQuery<HomeStats>((signal) => serversService.getHomeStats({ signal }), { queryKey: "account-sidebar-stats", keepPreviousData: true })
  const limits = overview?.competitive?.expLimits ?? null
  const next = profile?.next_rank_min_exp ?? null
  const progress = profile ? (next ? pct(profile.current_exp - profile.current_rank_min_exp, next - profile.current_rank_min_exp) : 100) : 0
  const tiles = [profile, stats, limits].filter(Boolean).length
  if (tiles === 0) return null
  return (
    <section aria-label="Overview" className="grid gap-3 @2xl:grid-cols-3">
      {profile && (
        <Tile label="Skill level">
          <div className="flex items-center gap-3">
            <CompetitiveRankBadge rankId={profile.rank_id} rankName={profile.rank_name} imageKey={profile.rank_image_key} size={34} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[17px] font-bold leading-tight" style={{ color: rankTierColor(profile.rank_id) }}>{profile.rank_name}</span>
                <span className="text-[13px] font-semibold text-[var(--text)]">{profile.current_exp.toLocaleString()} <span className="text-[11px] font-normal text-[var(--text-dim)]">EXP</span></span>
              </div>
              <div className="my-1.5 h-1 overflow-hidden rounded-full bg-[var(--line-soft)]" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the next rank"><div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${progress}%` }} /></div>
              <div className="flex justify-between text-[11px] text-[var(--text-dim)]"><span>{profile.current_rank_min_exp.toLocaleString()}</span><span>{next ? `${(next - profile.current_exp).toLocaleString()} to ${profile.next_rank_name ?? "the next rank"}` : "Top rank"}</span><span>{next ? next.toLocaleString() : ""}</span></div>
            </div>
          </div>
        </Tile>
      )}
      {stats?.modes && (
        <Tile label="Playing now">
          <div className="grid grid-cols-3 gap-2">
            {([["5x5", "5x5"], ["fun", "Fun"], ["pro", "Pro"]] as const).map(([key, label]) => {
              const players = stats.modes?.[key] ?? 0
              return (
                <div key={key} className="flex flex-col">
                  <span className="text-[22px] font-bold leading-tight text-[var(--text)]">{players}</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-dim)]"><span aria-hidden="true" className={cn("size-1.5 rounded-full", players > 0 ? "bg-[var(--status-green)]" : "bg-[var(--text-faint)]")} />{label}</span>
                </div>
              )
            })}
          </div>
        </Tile>
      )}
      {limits && (
        <Tile label="EXP today">
          {(() => {
            const used = pct(limits.day.used, limits.day.cap)
            const full = limits.day.used >= limits.day.cap
            return (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[22px] font-bold leading-tight text-[var(--text)]">{limits.day.used.toLocaleString()} <span className="text-[13px] font-normal text-[var(--text-dim)]">/ {limits.day.cap.toLocaleString()}</span></span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-[var(--line-soft)]"><div className="h-full rounded-full" style={{ width: `${used}%`, background: full ? "var(--status-red)" : "var(--status-green)" }} /></div>
                <span className={cn("text-[11px]", full ? "text-[var(--status-red)]" : "text-[var(--text-dim)]")}>{full ? "Daily limit reached · wins give ¼ EXP" : "Full EXP until the daily limit"}</span>
              </>
            )
          })()}
        </Tile>
      )}
    </section>
  )
}
