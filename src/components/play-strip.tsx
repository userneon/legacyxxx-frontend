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

const pct = (part: number, whole: number) => (whole > 0 ? Math.max(0, Math.min(100, (part / whole) * 100)) : 0)

/** One flat line, no boxes: a labelled figure, a thin rule between them. */
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-[var(--line)] @2xl:border-l @2xl:pl-6 first:border-l-0 first:pl-0">
      <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-dim)]">{label}</span>
      {children}
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
  const playing = stats?.modes ? (stats.modes["5x5"] ?? 0) + (stats.modes.pro ?? 0) : null
  if (!profile && playing === null && !limits) return null
  return (
    <section aria-label="Overview" className="grid gap-5 border-b border-[#2c2c2c] pb-6 @2xl:grid-cols-[minmax(0,1.6fr)_auto_minmax(0,1fr)] @2xl:gap-8">
      {profile && (
        <Stat label="Skill level">
          <div className="flex items-center gap-3">
            <CompetitiveRankBadge rankId={profile.rank_id} rankName={profile.rank_name} imageKey={profile.rank_image_key} size={32} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[16px] font-bold leading-tight" style={{ color: rankTierColor(profile.rank_id) }}>{profile.rank_name}</span>
                <span className="text-[13px] font-semibold text-[var(--text)]">{profile.current_exp.toLocaleString()} <span className="text-[11px] font-normal text-[var(--text-dim)]">EXP</span></span>
              </div>
              <div className="my-1.5 h-1 overflow-hidden bg-[var(--line)]" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the next rank"><div className="h-full bg-[var(--text)]" style={{ width: `${progress}%` }} /></div>
              <span className="text-[11px] text-[var(--text-dim)]">{next ? `${(next - profile.current_exp).toLocaleString()} EXP to ${profile.next_rank_name ?? "the next rank"}` : "Top rank"}</span>
            </div>
          </div>
        </Stat>
      )}
      {playing !== null && (
        <Stat label="Playing now">
          <span className="text-[22px] font-bold leading-tight text-[var(--text)]">{playing}</span>
        </Stat>
      )}
      {limits && (
        <Stat label="EXP today">
          {(() => {
            const full = limits.day.used >= limits.day.cap
            return (
              <>
                <span className="text-[22px] font-bold leading-tight text-[var(--text)]">{limits.day.used.toLocaleString()} <span className="text-[13px] font-normal text-[var(--text-dim)]">/ {limits.day.cap.toLocaleString()}</span></span>
                <div className="h-1 overflow-hidden bg-[var(--line)]"><div className="h-full" style={{ width: `${pct(limits.day.used, limits.day.cap)}%`, background: full ? "var(--status-red)" : "var(--status-green)" }} /></div>
                {full ? <span className="text-[11px] text-[var(--status-red)]">Daily limit reached · wins give ¼ EXP</span> : null}
              </>
            )
          })()}
        </Stat>
      )}
    </section>
  )
}
