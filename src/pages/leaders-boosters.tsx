import { useState } from "react"
import { Crown, RotateCcw } from "lucide-react"

import { discordService, type CommunityEntry } from "@/api/discord"
import { PlayerAvatar } from "@/components/player-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

type By = "boosts" | "invites"

const GRID = "grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-4 md:grid-cols-[56px_minmax(220px,1fr)_110px_150px_110px] md:gap-4 md:px-6"
const PODIUM_ORDER = [2, 1, 3]
const sinceText = (value: string | null) => (value ? new Date(value).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "—")

/** Discord name, then @username, as one block next to an avatar. */
function Who({ entry, big }: { entry: CommunityEntry; big?: boolean }) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className={cn("truncate font-semibold text-[var(--text)]", big ? "text-base" : "text-[13px]")} title={entry.name}>{entry.name}</span>
      {entry.username && <span className="truncate text-xs text-[var(--text-dim)]">@{entry.username}</span>}
    </span>
  )
}

function TopCard({ entry, by, onOpen }: { entry: CommunityEntry; by: By; onOpen?: () => void }) {
  const first = entry.position === 1
  const slot = PODIUM_ORDER.indexOf(entry.position)
  const Tag = onOpen ? "button" : "div"
  return (
    <Tag
      {...(onOpen ? { type: "button" as const, onClick: onOpen, "aria-label": `Open ${entry.name} profile` } : {})}
      style={{ order: slot, animationDelay: `${first ? 60 : 160 + slot * 60}ms` }}
      className={cn(
        "lx-fx-card group relative isolate flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl border bg-[var(--glass-fill)] p-[18px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50",
        first ? "border-[var(--brand)]/45" : "mt-6 border-[var(--line-soft)]",
      )}
    >
      {first && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[var(--brand-bright)] to-transparent" />}
      <span className="flex items-center gap-2">
        {first && <Crown aria-hidden="true" className="size-6 fill-[var(--brand)]/30 text-[var(--brand-bright)]" />}
        <span className={cn("font-bold leading-none tracking-[-1px]", first ? "text-[34px] text-[var(--text)]" : "text-[28px] text-[var(--text-2)]")}>#{entry.position}</span>
      </span>
      <span className="flex min-w-0 items-center gap-3">
        <PlayerAvatar avatar={entry.avatar || undefined} name={entry.name} className={cn("shrink-0 text-base", first ? "size-[60px] rounded-[15px] ring-2 ring-[var(--brand)]/70 ring-offset-2 ring-offset-[var(--card-surface)]" : "size-[52px] rounded-[13px]")} />
        <Who entry={entry} big={first} />
      </span>
      <span className="flex items-end justify-between border-t border-[var(--line-soft)] pt-3.5">
        <span className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[var(--text-dim)]">{by === "boosts" ? "Boosts" : "Invites"}</span>
          <span className={cn("font-bold leading-none", first ? "text-[22px] text-[var(--brand-bright)]" : "text-lg text-[var(--text)]")}>{(by === "boosts" ? entry.boosts : entry.invites).toLocaleString()}</span>
        </span>
        <span className="flex gap-3.5">
          <span className="flex flex-col items-end gap-1.5"><span className="text-[11px] text-[var(--text-dim)]">{by === "boosts" ? "Invites" : "Boosts"}</span><span className="text-xs text-[var(--text-2)]">{(by === "boosts" ? entry.invites : entry.boosts).toLocaleString()}</span></span>
          <span className="flex flex-col items-end gap-1.5"><span className="text-[11px] text-[var(--text-dim)]">Boosting since</span><span className="text-xs text-[var(--text-2)]">{sinceText(entry.boostingSince)}</span></span>
        </span>
      </span>
    </Tag>
  )
}

function Row({ entry, by, onOpen }: { entry: CommunityEntry; by: By; onOpen?: () => void }) {
  const Tag = onOpen ? "button" : "div"
  return (
    <Tag
      {...(onOpen ? { type: "button" as const, onClick: onOpen, "aria-label": `Open ${entry.name} profile` } : {})}
      className={cn(GRID, "lx-layer group h-14 w-full border-b border-[var(--raised)] text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-solid)]/50", onOpen && "hover:bg-[var(--raised)]")}
    >
      <span className="text-sm font-semibold text-[var(--text-muted)] group-hover:text-[var(--text)]">{entry.position}</span>
      <span className="flex min-w-0 items-center gap-3">
        <PlayerAvatar avatar={entry.avatar || undefined} name={entry.name} className="size-8 shrink-0 rounded-[9px] text-[10px]" />
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="min-w-0 truncate text-[13px] font-medium text-[var(--text)]" title={entry.name}>{entry.name}</span>
          {entry.username && <span className="shrink-0 text-xs text-[var(--text-dim)] max-sm:hidden">@{entry.username}</span>}
        </span>
      </span>
      <span className={cn("text-right text-[13px] max-md:hidden", by === "boosts" ? "font-semibold text-[var(--text)]" : "text-[var(--text-muted)]")}>{entry.boosts.toLocaleString()}</span>
      <span className="text-right text-[13px] text-[var(--text-muted)] max-md:hidden">{sinceText(entry.boostingSince)}</span>
      <span className={cn("text-right text-[13px] max-md:hidden", by === "invites" ? "font-semibold text-[var(--text)]" : "text-[var(--text-muted)]")}>{entry.invites.toLocaleString()}</span>
      <span className="text-right text-[13px] font-semibold text-[var(--text)] md:hidden">{(by === "boosts" ? entry.boosts : entry.invites).toLocaleString()}</span>
    </Tag>
  )
}

/** Leaders → Boosters: Discord members ranked by boosts of the Discord server or by the people they invited. */
export function BoosterLadder({ search, onProfileNavigate }: { search: string; onProfileNavigate: (userId: string) => void }) {
  const [by, setBy] = useState<By>("boosts")
  const { data, loading, error, refetch } = useApiQuery<CommunityEntry[]>((signal) => discordService.getCommunity(by, { signal }), { queryKey: `community:${by}`, keepPreviousData: true })
  const all = data ?? []
  const topThree = search ? [] : all.slice(0, 3)
  const rows = search ? all.filter((entry) => entry.name.toLowerCase().includes(search) || entry.username.toLowerCase().includes(search)) : all.slice(3)
  const firstLoad = loading && !data
  const open = (entry: CommunityEntry) => (entry.steamId ? () => onProfileNavigate(entry.steamId!) : undefined)

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
        <section aria-label="Top 3" className="lx-layer isolate flex snap-x gap-3 overflow-x-auto px-4 pb-5 pt-3 [&>*]:min-w-[78%] [&>*]:snap-center md:grid md:grid-cols-3 md:items-start md:overflow-visible md:px-6 md:[&>*]:min-w-0">
          {firstLoad ? [0, 1, 2].map((index) => <Skeleton key={index} className="h-[200px] rounded-xl" />) : topThree.map((entry) => <TopCard key={entry.discordId} entry={entry} by={by} onOpen={open(entry)} />)}
        </section>
      )}

      <div className={cn(GRID, "sticky top-0 z-[2] h-10 border-y border-[var(--line-soft)] bg-[var(--panel)] text-xs font-medium text-[var(--text-dim)]")}>
        <span>#</span>
        <span>Member</span>
        <span className={cn("text-right max-md:hidden", by === "boosts" && "text-[var(--brand-bright)]")}>Boosts</span>
        <span className="text-right max-md:hidden">Boosting since</span>
        <span className={cn("text-right max-md:hidden", by === "invites" && "text-[var(--brand-bright)]")}>Invites</span>
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
