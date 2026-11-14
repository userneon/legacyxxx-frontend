import { Link } from "react-router-dom"
import { Lock, Play, RotateCcw } from "lucide-react"

import { cn } from "@/lib/utils"
import { competitiveService } from "@/api"
import type { QueueMode } from "@/api/queue"
import type { CompetitiveAccess, PlaySubMode } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { PlayStrip } from "@/components/play-strip"
import { PlayQueue } from "@/components/play-queue"
import { PAGE_ROUTES } from "@/lib/routes"
import { CompetitiveRankBadge, RankLabel } from "@/components/competitive-rank-badge"
import { SteamLoginGate } from "@/components/steam-login-gate"
import { Skeleton } from "@/components/ui/skeleton"

/** Pro League opens at Vanguard I (RANK-SYSTEM.md section 4). */
const PRO_LEAGUE_MIN_EXP = 1400

type PlayPageMode = Exclude<PlaySubMode, "tournaments">

const QUEUE_MODE: Record<PlayPageMode, QueueMode> = { "5vs5": "5x5", proleague: "pro" }

const primary = "lx-primary-button inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50 disabled:pointer-events-none disabled:opacity-40 disabled:saturate-50"

/** Pro League for a signed-in player below the required rank: how far they are and the way there. */
function ProLocked({ access }: { access: CompetitiveAccess }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-[340px]"><ProLockPad access={access} /></div>
    </div>
  )
}

function ProLockPad({ access }: { access: CompetitiveAccess }) {
  const exp = access.competitive?.current_exp ?? 1000
  const toGo = Math.max(0, PRO_LEAGUE_MIN_EXP - exp)
  const share = Math.min(100, (exp / PRO_LEAGUE_MIN_EXP) * 100)
  return (
    <div aria-label="Pro League is locked" className="relative flex flex-col items-center gap-3 rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] p-5 text-center">
      <span className="flex size-12 items-center justify-center rounded-[12px] border border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text-2)]"><Lock className="size-5" /></span>
      <span className="flex flex-wrap items-center justify-center gap-1.5 text-[13px] font-semibold text-[var(--text)]">
        Opens at
        <RankLabel rankId={access.requiredRankId} rankName={access.requiredRankName} size={20} nameClassName="text-[13px] font-semibold" />
      </span>
      <div className="flex w-full flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <CompetitiveRankBadge rankId={access.competitive?.rank_id ?? 7} rankName={access.competitive?.rank_name ?? "Your rank"} imageKey={access.competitive?.rank_image_key} size={18} />
            You
          </span>
          <span>{toGo.toLocaleString()} EXP to go</span>
        </div>
        <span className="h-1.5 overflow-hidden rounded-full bg-[var(--line-soft)]">
          <span className="lx-progress-fill block h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `${share}%` }} />
        </span>
      </div>
      <Link to={PAGE_ROUTES["play-5vs5"]} className={cn(primary, "h-9 w-full px-4 text-[13px]")}>
        <Play className="size-3.5 fill-current" />
        Play 5x5 to rank up
      </Link>
    </div>
  )
}

export function PlayPage({ mode }: { mode: PlayPageMode }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const isPro = mode === "proleague"
  const { data: access, loading: accessLoading, error: accessError, refetch: refetchAccess } = useApiQuery<CompetitiveAccess>((signal) => competitiveService.getMyAccess({ signal }), {
    enabled: isPro && isAuthenticated,
    queryKey: isPro && isAuthenticated ? "competitive-proleague-access" : "competitive-proleague-access-disabled",
  })

  // Pro League is for signed-in players only: a visitor sees the sign-in page, not the servers.
  if (isPro && !authLoading && !isAuthenticated) return <SteamLoginGate pageName="Pro League" />
  if (isPro && (authLoading || (accessLoading && !access))) {
    return (
      <div className="flex flex-col gap-4 p-6" aria-hidden="true">
        <Skeleton className="h-10 w-72 rounded-lg bg-[var(--raised)]" />
        <Skeleton className="h-64 rounded-xl bg-[var(--glass-fill)]" />
      </div>
    )
  }
  if (isPro && !access && accessError) {
    return (
      <p className="flex items-center justify-center gap-3 py-16 text-[13px] text-[var(--text-dim)]">
        Could not check your Pro League access.
        <button type="button" onClick={refetchAccess} className="inline-flex items-center gap-1.5 text-[var(--text-2)] transition-colors hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>
      </p>
    )
  }
  if (isPro && access && !access.proLeagueUnlocked) return <ProLocked access={access} />
  // Switching mode in the sidebar keeps the page but swaps what is on it: the new mode fades and rises in.
  return (
    <div key={mode} className="lx-swap-in flex min-h-0 flex-1 flex-col gap-4 p-4 @container">
      <PlayStrip />
      <PlayQueue mode={QUEUE_MODE[mode]} />
    </div>
  )
}
