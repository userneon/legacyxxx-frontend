import { useState } from "react"
import { Crown, RotateCcw } from "lucide-react"

import { discordService, type CommunityEntry } from "@/api/discord"
import { PlayerAvatar } from "@/components/player-avatar"
import { SteamIcon } from "@/components/steam-login-gate"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"
import boostGem from "@/assets/boosters/boost-gem.webp"
import boostSquare from "@/assets/boosters/boost-square.webp"

type By = "boosts" | "invites"

const GRID = "grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-4 md:grid-cols-[48px_minmax(140px,1fr)_90px_90px_104px] md:gap-3 lg:grid-cols-[56px_minmax(220px,1fr)_110px_150px_110px_96px] lg:gap-4 md:px-6"
const PODIUM_ORDER = [2, 1, 3]
const sinceText = (value: string | null) => (value ? new Date(value).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "—")

/** Discord name, then @username, as one block next to an avatar. */
function Who({ entry, big }: { entry: CommunityEntry; big?: boolean }) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className={cn("truncate font-semibold text-[var(--text)]", big ? "text-base" : "text-[13px]", entry.boosting && "lx-boost-name")} title={entry.name}>{entry.name}</span>
      {entry.username && <span className="truncate text-xs text-[var(--text-dim)]">@{entry.username}</span>}
    </span>
  )
}

/** Opens the player's LEGACY-X profile (every member listed here linked Steam). */
function ProfileButton({ entry, onOpen, className }: { entry: CommunityEntry; onOpen: () => void; className?: string }) {
  return (
    <button type="button" onClick={onOpen} aria-label={`Open ${entry.name} profile`} className={cn("inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-2.5 text-xs font-medium text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50", className)}>
      <SteamIcon className="size-3.5" />
      Profile
    </button>
  )
}

function TopCard({ entry, by, onOpen }: { entry: CommunityEntry; by: By; onOpen: () => void }) {
  const first = entry.position === 1
  const slot = PODIUM_ORDER.indexOf(entry.position)
  return (
    <div
      style={{ order: slot, animationDelay: `${first ? 60 : 160 + slot * 60}ms` }}
      className={cn(
        "lx-boost lx-fx-card group relative isolate flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl border p-[18px] text-left",
        first ? "lx-boost-first" : "mt-6",
      )}
    >
      {first && <span aria-hidden="true" className="lx-boost-orbit" />}
      {first && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[var(--boost)] to-transparent" />}
      <img src={first ? boostGem : boostSquare} alt="" aria-hidden="true" className="lx-boost-gem pointer-events-none absolute right-4 top-[58px] -z-10 w-[76px] opacity-30 transition-[opacity,translate] duration-500 group-hover:opacity-55" />
      <span className="flex items-center justify-between gap-2">
       <span className="flex items-center gap-2">
        {first && <Crown aria-hidden="true" className="size-6 fill-[var(--boost)]/30 text-[var(--boost)]" />}
        <span className={cn("font-bold leading-none tracking-[-1px]", first ? "text-[34px] text-[var(--text)]" : "text-[28px] text-[var(--text-2)]")}>#{entry.position}</span>
       </span>
        <ProfileButton entry={entry} onOpen={onOpen} />
      </span>
      <span aria-hidden="true" className="lx-boost-star right-[92px] top-[54px]" style={{ animationDelay: "0s" }} />
      <span aria-hidden="true" className="lx-boost-star right-6 top-[96px]" style={{ animationDelay: "1.1s", width: 7, height: 7 }} />
      <span aria-hidden="true" className="lx-boost-star right-[60px] top-[50px]" style={{ animationDelay: "2.1s", width: 8, height: 8 }} />
      <span className="flex min-w-0 items-center gap-3">
        <PlayerAvatar avatar={entry.avatar || undefined} name={entry.name} className={cn("shrink-0 text-base", first ? "size-[60px] rounded-[15px] ring-2 ring-[var(--boost)]/70 ring-offset-2 ring-offset-[var(--card-surface)]" : "size-[52px] rounded-[13px]")} />
        <Who entry={entry} big={first} />
      </span>
      <span className="flex items-end justify-between border-t border-[var(--line-soft)] pt-3.5">
        <span className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[var(--text-dim)]">{by === "boosts" ? "Boosts" : "Invites"}</span>
          <span className={cn("flex items-center gap-1.5 font-bold leading-none", first ? "text-[22px]" : "text-lg text-[var(--text)]", first && "lx-boost-num")}>{by === "boosts" && <img src={boostSquare} alt="" aria-hidden="true" className="size-[1em]" />}{(by === "boosts" ? entry.boosts : entry.invites).toLocaleString()}</span>
        </span>
        <span className="flex gap-3.5">
          <span className="flex flex-col items-end gap-1.5"><span className="text-[11px] text-[var(--text-dim)]">{by === "boosts" ? "Invites" : "Boosts"}</span><span className="text-xs text-[var(--text-2)]">{(by === "boosts" ? entry.invites : entry.boosts).toLocaleString()}</span></span>
          <span className="flex flex-col items-end gap-1.5"><span className="text-[11px] text-[var(--text-dim)]">Boosting since</span><span className="text-xs text-[var(--text-2)]">{sinceText(entry.boostingSince)}</span></span>
        </span>
      </span>
    </div>
  )
}

function Row({ entry, by, onOpen }: { entry: CommunityEntry; by: By; onOpen: () => void }) {
  return (
    <div className={cn(GRID, "lx-boost-row lx-layer group relative h-14 w-full overflow-hidden border-b border-[var(--raised)] text-left transition-colors", entry.boosting && "lx-boost-row-on")}>
      {entry.boosting && <span aria-hidden="true" className="lx-boost-star left-[78px] top-[10px]" style={{ animationDelay: "0.4s", width: 8, height: 8 }} />}
      {entry.boosting && <span aria-hidden="true" className="lx-boost-star left-[228px] top-[38px]" style={{ animationDelay: "1.6s", width: 7, height: 7 }} />}
      <span className="text-sm font-semibold text-[var(--text-muted)] group-hover:text-[var(--text)]">{entry.position}</span>
      <span className="flex min-w-0 items-center gap-3">
        <PlayerAvatar avatar={entry.avatar || undefined} name={entry.name} className="size-8 shrink-0 rounded-[9px] text-[10px]" />
        <span className="flex min-w-0 items-baseline gap-2">
          <span className={cn("min-w-0 truncate text-[13px] font-medium text-[var(--text)]", entry.boosting && "lx-boost-name")} title={entry.name}>{entry.name}</span>
          {entry.username && <span className="shrink-0 text-xs text-[var(--text-dim)] max-sm:hidden">@{entry.username}</span>}
        </span>
      </span>
      <span className={cn("text-right text-[13px] max-md:hidden", by === "boosts" ? "font-semibold text-[var(--text)]" : "text-[var(--text-muted)]")}><span className="inline-flex items-center justify-end gap-1.5">{entry.boosts > 0 && <img src={boostSquare} alt="" aria-hidden="true" className="lx-boost-gem-sm size-3.5" />}{entry.boosts.toLocaleString()}</span></span>
      <span className="text-right text-[13px] text-[var(--text-muted)] max-lg:hidden">{sinceText(entry.boostingSince)}</span>
      <span className={cn("text-right text-[13px] max-md:hidden", by === "invites" ? "font-semibold text-[var(--text)]" : "text-[var(--text-muted)]")}>{entry.invites.toLocaleString()}</span>
      <span className="flex justify-end max-md:hidden"><ProfileButton entry={entry} onOpen={onOpen} /></span>
      <span className="flex items-center justify-end gap-3 md:hidden">
        <span className="text-[13px] font-semibold text-[var(--text)]">{(by === "boosts" ? entry.boosts : entry.invites).toLocaleString()}</span>
        <ProfileButton entry={entry} onOpen={onOpen} />
      </span>
    </div>
  )
}

/** Leaders → Boosters: Discord members ranked by boosts of the Discord server or by the people they invited. */
export function BoosterLadder({ search, onProfileNavigate }: { search: string; onProfileNavigate: (userId: string) => void }) {
  const [by, setBy] = useState<By>("boosts")
  const { data, loading, error, refetch } = useApiQuery<CommunityEntry[]>((signal) => discordService.getCommunity(by, { signal }), { queryKey: `community:${by}`, keepPreviousData: true })
  const all = data ?? []
  const metricOf = (entry: CommunityEntry) => (by === "boosts" ? entry.boosts : entry.invites)
  // The podium is for members who have a count; everyone else follows in the list with 0.
  const topThree = search ? [] : all.slice(0, 3).filter((entry) => metricOf(entry) > 0)
  const rows = search ? all.filter((entry) => entry.name.toLowerCase().includes(search) || entry.username.toLowerCase().includes(search)) : all.slice(topThree.length)
  const firstLoad = loading && !data
  const open = (entry: CommunityEntry) => () => onProfileNavigate(entry.steamId)

  return (
    <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-3 px-4 pb-1 pt-3 md:px-6">
        <div className="flex items-center gap-1 text-[13px]" role="group" aria-label="Rank by">
          {([["boosts", "Most boosts"], ["invites", "Most invites"]] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={by === value} onClick={() => setBy(value)} className={cn("h-8 rounded-md px-2.5 transition-colors", by === value ? "bg-[var(--raised)] text-[var(--text)]" : "text-[var(--text-dim)] hover:text-[var(--text)]")}>{label}</button>
          ))}
        </div>
      </div>

      {(firstLoad || topThree.length > 0) && (
        <section aria-label="Top 3" className="lx-layer isolate flex snap-x gap-3 overflow-x-auto px-4 pb-5 pt-3 [&>*]:min-w-[78%] [&>*]:snap-center lg:grid lg:grid-cols-3 lg:items-start lg:overflow-visible md:px-6 lg:[&>*]:min-w-0">
          {firstLoad ? [0, 1, 2].map((index) => <Skeleton key={index} className="h-[200px] rounded-xl" />) : topThree.map((entry) => <TopCard key={entry.discordId} entry={entry} by={by} onOpen={open(entry)} />)}
        </section>
      )}

      <div className={cn(GRID, "sticky top-0 z-[2] h-10 border-y border-[var(--line-soft)] bg-[var(--panel)] text-xs font-medium text-[var(--text-dim)]")}>
        <span>#</span>
        <span>Member</span>
        <span className={cn("text-right max-md:hidden", by === "boosts" && "text-[var(--brand-bright)]")}>Boosts</span>
        <span className="text-right max-lg:hidden">Boosting since</span>
        <span className={cn("text-right max-md:hidden", by === "invites" && "text-[var(--brand-bright)]")}>Invites</span>
        <span className="max-md:hidden" aria-hidden="true" />
        <span className="text-right text-[var(--brand-bright)] md:hidden">{by === "boosts" ? "Boosts" : "Invites"}</span>
      </div>

      {firstLoad ? (
        Array.from({ length: 5 }, (_, index) => <div key={index} className={cn(GRID, "h-14 border-b border-[var(--raised)]")}><Skeleton className="h-4 w-6" /><Skeleton className="h-5 w-40" /></div>)
      ) : error && !data ? (
        <p className="flex items-center justify-center gap-3 px-6 py-10 text-[13px] text-[var(--text-dim)]">
          Could not load the Discord ranking.
          <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] transition-colors hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>
        </p>
      ) : all.length === 0 ? (
        <p className="px-6 py-10 text-center text-[13px] text-[var(--text-dim)]">{by === "boosts" ? "No one has boosted the Discord server yet." : "No invites counted yet."}</p>
      ) : rows.length === 0 ? (
        <p className="px-6 py-10 text-center text-[13px] text-[var(--text-dim)]">{search ? "No member matches this search." : "Only the top three so far."}</p>
      ) : (
        rows.map((entry) => <Row key={entry.discordId} entry={entry} by={by} onOpen={open(entry)} />)
      )}
      <div className="h-4" />
    </div>
  )
}
