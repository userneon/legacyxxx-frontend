import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ChevronRight, ExternalLink, LoaderCircle, RotateCcw, Search, ShieldAlert, ShieldCheck } from "lucide-react"

import { cn } from "@/lib/utils"
import { moderationService, profileService } from "@/api"
import type { PenaltyEntry, PenaltyType } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { LINKS, steamIdFromInput } from "@/lib/links"
import { PlayerModerationAvatar } from "@/components/player-moderation-avatar"
import {
  PenaltyDetailSheet,
  TYPE_META,
  TypePill,
  StatusPill,
  TermLabel,
  penaltyStatusColor,
  formatPenaltyDate,
  penaltyStatus,
} from "@/components/penalty-detail-dialog"
import { Segmented } from "@/components/segmented"
import { Skeleton } from "@/components/ui/skeleton"

type TypeFilter = "all" | PenaltyType
type StatusFilter = "all" | "active"

/** One grid for the header row and every penalty row. */
const GRID = "grid grid-cols-[minmax(200px,1.1fr)_84px_100px_minmax(200px,1.5fr)_120px_100px_20px] items-center gap-4 px-6"
const SEARCH_DEBOUNCE_MS = 250

const readType = (value: string | null): TypeFilter => (value === "ban" || value === "comm" || value === "gag" ? value : "all")

function YourStatus({ penalties, loading, onDetails }: { penalties: PenaltyEntry[]; loading: boolean; onDetails: (penalty: PenaltyEntry) => void }) {
  const active = penalties.find((penalty) => penaltyStatus(penalty) === "active")
  if (loading && penalties.length === 0) {
    return (
      <div className="flex items-center gap-3.5 rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] px-[18px] py-4" aria-hidden="true">
        <Skeleton className="size-10 rounded-[10px] bg-[var(--line-soft)]" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-40 rounded-full bg-[var(--line)]" />
          <Skeleton className="h-2.5 w-56 rounded-full bg-[var(--line-soft)]" />
        </div>
      </div>
    )
  }
  if (!active) {
    return (
      <section aria-label="Your status" className="flex items-center gap-3.5 rounded-xl border border-[var(--status-green)]/30 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--status-green)_7%,transparent),transparent_60%)] bg-[var(--card-surface)] px-[18px] py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--status-green)]/10 text-[var(--status-green)]">
          <ShieldCheck className="size-[18px]" />
        </span>
        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className="text-sm font-semibold text-[var(--text)]">Your record is clean</span>
          <span className="text-[13px] text-[var(--text-muted)]">No active penalties on your account.</span>
        </span>
      </section>
    )
  }
  return (
    <section
      aria-label="Your status"
      className="flex flex-wrap items-center gap-3.5 rounded-xl border bg-[var(--card-surface)] px-[18px] py-4"
      style={{ borderColor: `color-mix(in oklab, ${penaltyStatusColor(active)} 45%, transparent)`, backgroundImage: `linear-gradient(90deg, color-mix(in oklab, ${penaltyStatusColor(active)} 8%, transparent), transparent 60%)` }}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px]" style={{ color: penaltyStatusColor(active), backgroundColor: `color-mix(in oklab, ${penaltyStatusColor(active)} 14%, transparent)` }}>
        <ShieldAlert className="size-[18px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-semibold text-[var(--text)]">You have an active penalty</span>
        <span className="flex min-w-0 items-center gap-2 text-[13px] text-[var(--text-muted)]">
          <TypePill type={active.type} />
          <span className="min-w-0 truncate" title={active.reason}>{active.reason || "No reason given"}</span>
          <TermLabel penalty={active} className="shrink-0 font-medium" />
        </span>
      </span>
      <button
        type="button"
        onClick={() => onDetails(active)}
        className="h-9 shrink-0 rounded-lg border border-[var(--line)] px-3.5 text-[13px] font-medium text-[var(--text)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"
      >
        Details
      </button>
      {LINKS.discordAppeals && (
        <a
          href={LINKS.discordAppeals}
          target="_blank"
          rel="noreferrer"
          className="flex h-9 shrink-0 items-center rounded-lg bg-[var(--accent-solid)] px-3.5 text-[13px] font-semibold text-[var(--accent-on)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"
        >
          Appeal on Discord
        </a>
      )}
    </section>
  )
}

function PenaltyRow({ penalty, onOpen }: { penalty: PenaltyEntry; onOpen: () => void }) {
  const reason = penalty.reason || "No reason given"
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${(TYPE_META[penalty.type] ?? TYPE_META.ban).label} · ${penalty.player}`}
      className={cn(
        GRID,
        "h-14 w-full border-b border-[var(--raised)] text-left transition-colors duration-150",
        "hover:bg-[var(--card-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-solid)]/60",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <PlayerModerationAvatar avatar={penalty.avatar} name={penalty.player} status={penalty.moderationStatus} className="size-8 shrink-0 rounded-[9px] text-xs" />
        <span className="min-w-0 truncate text-[13px] font-medium text-[var(--text)]" title={penalty.player}>{penalty.player}</span>
      </span>
      <span><TypePill type={penalty.type} /></span>
      <span><StatusPill penalty={penalty} /></span>
      <span className="min-w-0 truncate text-[13px] text-[var(--text-2)]" title={reason}>{reason}</span>
      <TermLabel penalty={penalty} className="text-[13px] font-medium" />
      <span className="text-[13px] tabular-nums text-[var(--text-muted)]" title={formatPenaltyDate(penalty.date, true)}>{formatPenaltyDate(penalty.date)}</span>
      <ChevronRight className="size-4 text-[var(--text-faint)]" />
    </button>
  )
}

function GroupHeader({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex h-9 items-center gap-2 border-b border-[var(--raised)] bg-[#0c0c0c] px-6 text-xs font-semibold text-[var(--text-muted)]">
      <span className={cn("size-1.5 rounded-full", active ? "bg-[var(--status-red)]" : "bg-[var(--text-faint)]")} />
      {label}
    </div>
  )
}

function RowSkeleton() {
  return (
    <div className={cn(GRID, "h-14 border-b border-[var(--raised)]")} aria-hidden="true">
      <span className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-[9px] bg-[var(--line-soft)]" />
        <Skeleton className="h-2.5 w-[55%] rounded-full bg-[var(--line)]" />
      </span>
      <Skeleton className="h-5 w-12 rounded-full bg-[var(--raised)]" />
      <Skeleton className="h-2.5 w-3/4 rounded-full bg-[var(--line-soft)]" />
      <Skeleton className="h-2.5 w-16 rounded-full bg-[var(--line-soft)]" />
      <Skeleton className="h-2.5 w-14 rounded-full bg-[var(--line-soft)]" />
      <span />
    </div>
  )
}

export function PenaltiesPage({ onProfileNavigate }: { onProfileNavigate: (userId: string) => void }) {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const type = readType(params.get("type"))
  const status: StatusFilter = params.get("status") === "active" ? "active" : "all"
  const openId = params.get("penalty")
  const [query, setQuery] = useState(params.get("q") ?? "")
  const search = steamIdFromInput(params.get("q") ?? "").toLowerCase()

  const update = (changes: Record<string, string | null>) => {
    setParams((current) => {
      const next = new URLSearchParams(current)
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      return next
    }, { replace: true })
  }

  // Search, filters and the open penalty all live in the URL, so a link can point at one penalty.
  useEffect(() => {
    const timer = window.setTimeout(() => update({ q: query.trim() || null }), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const { data: penalties, loading, error, refetch } = useApiQuery<PenaltyEntry[]>((signal) => moderationService.getPenalties(undefined, { signal }))
  const { data: mine, loading: mineLoading } = useApiQuery<PenaltyEntry[]>(
    (signal) => profileService.getPenalties("me", { signal }),
    { enabled: Boolean(user), queryKey: `my-penalties:${user?.id ?? "guest"}` },
  )

  const all = useMemo(() => [...(penalties ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [penalties])
  // "Check a player": a name, a SteamID64, or a pasted Steam profile link.
  const found = search
    ? all.filter((penalty) => [penalty.player, penalty.playerSteamId].some((field) => String(field ?? "").toLowerCase().includes(search)))
    : all
  const counts: Record<TypeFilter, number> = {
    all: found.length,
    ban: found.filter((penalty) => penalty.type === "ban").length,
    comm: found.filter((penalty) => penalty.type === "comm").length,
    gag: found.filter((penalty) => penalty.type === "gag").length,
  }
  const filtered = type === "all" ? found : found.filter((penalty) => penalty.type === type)
  const activeRows = filtered.filter((penalty) => penaltyStatus(penalty) === "active")
  const historyRows = status === "active" ? [] : filtered.filter((penalty) => penaltyStatus(penalty) !== "active")
  const selected = openId ? [...all, ...(mine ?? [])].find((penalty) => penalty.id === openId) ?? null : null
  const isOwn = Boolean(selected && user && (selected.playerSteamId === user.steamId || (mine ?? []).some((penalty) => penalty.id === selected.id)))
  const firstLoad = loading && all.length === 0

  return (
    <div className="scrollbar-hidden flex min-h-0 flex-1 overflow-x-auto">
      <div className="flex min-w-[900px] flex-1 flex-col">
        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-[18px] px-6 pb-4 pt-6">
            <div className="flex items-end justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="flex items-center gap-2 text-[22px] font-semibold leading-[1.2] tracking-[-0.3px] text-[var(--text)]">
                  Penalties
                  {loading && all.length > 0 && <LoaderCircle aria-label="Updating" className="size-4 animate-spin text-[var(--text-dim)]" />}
                </h1>
                <span className="text-[13px] leading-[1.2] text-[var(--text-muted)]">Every ban, mute and gag on Legacy-X servers is public.</span>
              </div>
              {LINKS.serverRules && (
                <a href={LINKS.serverRules} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">
                  Server rules
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>

            {user && <YourStatus penalties={mine ?? []} loading={mineLoading} onDetails={(penalty) => update({ penalty: penalty.id })} />}

            <div className="flex flex-wrap items-center gap-2.5">
              <label className="flex h-10 min-w-[260px] flex-1 items-center gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--card-surface)] px-3 transition-colors focus-within:border-[var(--line-strong)]">
                <Search className="size-4 shrink-0 text-[var(--text-dim)]" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Check a player"
                  placeholder="Check a player — name, Steam ID or profile link"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]"
                />
              </label>
              <Segmented
                ariaLabel="Type"
                value={type}
                onChange={(value) => update({ type: value === "all" ? null : value })}
                options={[
                  { value: "all", label: "All", count: counts.all },
                  { value: "ban", label: "Bans", count: counts.ban },
                  { value: "comm", label: "Mutes", count: counts.comm },
                  { value: "gag", label: "Gags", count: counts.gag },
                ]}
              />
              <Segmented
                ariaLabel="Status"
                value={status}
                onChange={(value) => update({ status: value === "all" ? null : value })}
                options={[
                  { value: "all", label: "All" },
                  { value: "active", label: "Active only" },
                ]}
              />
            </div>
          </div>

          <div className={cn(GRID, "sticky top-0 z-[2] h-[38px] border-y border-[var(--line-soft)] bg-[var(--panel)] text-xs font-medium text-[var(--text-dim)]")}>
            <span>Player</span>
            <span>Type</span>
            <span>Status</span>
            <span>Reason</span>
            <span>Term</span>
            <span>Date</span>
            <span />
          </div>

          {/* The body crossfades when a filter changes; keyed so the fade replays. */}
          <div key={`${type}:${status}:${search}`} className="animate-in fade-in-0 duration-150 motion-reduce:animate-none">
            {firstLoad ? (
              Array.from({ length: 8 }, (_, index) => <RowSkeleton key={index} />)
            ) : error && all.length === 0 ? (
              <p className="flex items-center justify-center gap-3 px-6 py-10 text-[13px] text-[var(--text-dim)]">
                Could not load the penalty record.
                <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] transition-colors hover:text-[var(--text)]">
                  <RotateCcw className="size-3.5" />
                  Retry
                </button>
              </p>
            ) : activeRows.length === 0 && historyRows.length === 0 ? (
              <p className="px-6 py-10 text-center text-[13px] text-[var(--text-dim)]">
                {search || type !== "all" || status !== "all" ? "No penalty matches these filters." : "No penalties on record."}
              </p>
            ) : (
              <>
                {activeRows.length > 0 && (
                  <>
                    <GroupHeader label="Active" active />
                    {activeRows.map((penalty) => <PenaltyRow key={penalty.id} penalty={penalty} onOpen={() => update({ penalty: penalty.id })} />)}
                  </>
                )}
                {historyRows.length > 0 && (
                  <>
                    <GroupHeader label="History" active={false} />
                    {historyRows.map((penalty) => <PenaltyRow key={penalty.id} penalty={penalty} onOpen={() => update({ penalty: penalty.id })} />)}
                  </>
                )}
              </>
            )}
          </div>
          <div className="h-6" />
        </div>
      </div>

      <PenaltyDetailSheet penalty={selected} isOwn={isOwn} onClose={() => update({ penalty: null })} onProfileNavigate={onProfileNavigate} />
    </div>
  )
}
