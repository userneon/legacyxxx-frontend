import { useState } from "react"
import { RotateCcw } from "lucide-react"

import { discordService, type CommunityEntry } from "@/api/discord"
import { PlayerAvatar } from "@/components/player-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

type By = "boosts" | "invites"

const GRID = "grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-4 md:grid-cols-[56px_minmax(220px,1fr)_110px_150px_110px] md:gap-4 md:px-6"
const sinceText = (value: string | null) => (value ? new Date(value).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "—")

/** Leaders → Boosters: members who linked Discord, ranked by boosts of the Discord server or by the people they invited. */
export function BoosterLadder({ search, onProfileNavigate }: { search: string; onProfileNavigate: (userId: string) => void }) {
  const [by, setBy] = useState<By>("boosts")
  const { data, loading, error, refetch } = useApiQuery<CommunityEntry[]>((signal) => discordService.getCommunity(by, { signal }), { queryKey: `community:${by}`, keepPreviousData: true })
  const entries = (data ?? []).filter((entry) => !search || entry.username.toLowerCase().includes(search))
  const firstLoad = loading && !data
  const metric = (entry: CommunityEntry) => (by === "boosts" ? entry.boosts : entry.invites)

  return (
    <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-3 px-4 pb-3 pt-3 md:px-6">
        <div className="flex items-center gap-1 text-[13px]" role="group" aria-label="Rank by">
          {([["boosts", "Most boosts"], ["invites", "Most invites"]] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={by === value} onClick={() => setBy(value)} className={cn("h-8 rounded-md px-2.5 transition-colors", by === value ? "bg-[var(--raised)] text-[var(--text)]" : "text-[var(--text-dim)] hover:text-[var(--text)]")}>{label}</button>
          ))}
        </div>
        <span className="text-xs text-[var(--text-dim)]">Members who linked Discord in Settings. Boosts count from when the bot started watching.</span>
      </div>

      <div className={cn(GRID, "sticky top-0 z-[2] h-10 border-y border-[var(--line-soft)] bg-[var(--panel)] text-xs font-medium text-[var(--text-dim)]")}>
        <span>#</span>
        <span>Player</span>
        <span className={cn("text-right max-md:hidden", by === "boosts" && "text-[var(--brand-bright)]")}>Boosts</span>
        <span className="text-right max-md:hidden">Boosting since</span>
        <span className={cn("text-right max-md:hidden", by === "invites" && "text-[var(--brand-bright)]")}>Invites</span>
        <span className="text-right text-[var(--brand-bright)] md:hidden">{by === "boosts" ? "Boosts" : "Invites"}</span>
      </div>

      {firstLoad ? (
        Array.from({ length: 6 }, (_, index) => <div key={index} className={cn(GRID, "h-14 border-b border-[var(--raised)]")}><Skeleton className="h-4 w-6" /><Skeleton className="h-5 w-40" /></div>)
      ) : error && !data ? (
        <p className="flex items-center justify-center gap-3 px-6 py-10 text-[13px] text-[var(--text-dim)]">
          Could not load the Discord ranking.
          <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] transition-colors hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>
        </p>
      ) : entries.length === 0 ? (
        <p className="px-6 py-10 text-center text-[13px] text-[var(--text-dim)]">{search ? "No player matches this search." : by === "boosts" ? "No one has boosted the Discord server yet." : "No invites counted yet."}</p>
      ) : (
        entries.map((entry) => (
          <button key={entry.steamId} type="button" onClick={() => onProfileNavigate(entry.steamId)} aria-label={`Open ${entry.username} profile`} className={cn(GRID, "lx-layer group h-14 w-full border-b border-[var(--raised)] text-left transition-colors hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-solid)]/50")}>
            <span className="text-sm font-semibold text-[var(--text-muted)] group-hover:text-[var(--text)]">{entry.position}</span>
            <span className="flex min-w-0 items-center gap-3">
              <PlayerAvatar avatar={entry.avatar || undefined} name={entry.username} className="size-8 shrink-0 rounded-[9px] text-[10px]" />
              <span className="min-w-0 truncate text-[13px] font-medium text-[var(--text)]" title={entry.username}>{entry.username}</span>
            </span>
            <span className={cn("text-right text-[13px] max-md:hidden", by === "boosts" ? "font-semibold text-[var(--text)]" : "text-[var(--text-muted)]")}>{entry.boosts.toLocaleString()}</span>
            <span className="text-right text-[13px] text-[var(--text-muted)] max-md:hidden">{sinceText(entry.boostingSince)}</span>
            <span className={cn("text-right text-[13px] max-md:hidden", by === "invites" ? "font-semibold text-[var(--text)]" : "text-[var(--text-muted)]")}>{entry.invites.toLocaleString()}</span>
            <span className="text-right text-[13px] font-semibold text-[var(--text)] md:hidden">{metric(entry).toLocaleString()}</span>
          </button>
        ))
      )}
      <div className="h-4" />
    </div>
  )
}
