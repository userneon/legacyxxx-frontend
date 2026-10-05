import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { ChevronRight, ExternalLink, LoaderCircle, RotateCcw, Search, ShieldAlert, ShieldCheck } from "lucide-react"

import { cn } from "@/lib/utils"
import { PAGE_TITLES } from "@/lib/routes"
import { moderationService, profileService } from "@/api"
import type { PenaltyEntry, PenaltyType } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useViewParams } from "@/hooks/use-view-params"
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
import { AnimatedNumber } from "@/components/animated-number"
import { useFlip } from "@/hooks/use-flip"

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
      <div className="flex items-center gap-3.5 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] px-[18px] py-4" aria-hidden="true">
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
      <section aria-label="Your status" className="lx-swap-in flex items-center gap-3.5 rounded-xl border border-[var(--status-green)]/30 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--status-green)_7%,transparent),transparent_60%)] bg-[var(--glass-fill)] px-[18px] py-4">
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
      className="lx-swap-in flex flex-wrap items-center gap-3.5 rounded-xl border bg-[var(--glass-fill)] px-[18px] py-4"
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
        className="h-9 shrink-0 rounded-lg border border-[var(--line)] px-3.5 text-[13px] font-medium text-[var(--text)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50"
      >
        Details
      </button>
      {LINKS.discordAppeals && (
        <a
          href={LINKS.discordAppeals}
          target="_blank"
          rel="noreferrer"
          className="lx-primary-button flex h-9 shrink-0 items-center rounded-lg px-3.5 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50"
        >
          Appeal on Discord
        </a>
      )}
    </section>
  )
}

function PenaltyRow({ penalty, onOpen, index }: { penalty: PenaltyEntry; onOpen: () => void; index: number }) {
  const reason = penalty.reason || "No reason given"
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${(TYPE_META[penalty.type] ?? TYPE_META.ban).label} · ${penalty.player}`}
      data-flip={penalty.id}
      style={{ animationDelay: `${Math.min(index, 14) * 28}ms` }}
      className={cn(
        GRID,
        "lx-row-in group relative h-14 w-full border-b border-[var(--raised)] text-left transition-[background-color] duration-500 ease-[cubic-bezier(0.37,0,0.18,1)] hover:duration-200",
        "hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-solid)]/50",
      )}
    >
      <span
        aria-hidden="true"
        className="absolute bottom-2 left-0 top-2 w-[3px] scale-y-0 rounded-r-full bg-[var(--text-2)] opacity-0 transition-[scale,opacity] duration-500 ease-[cubic-bezier(0.37,0,0.18,1)] group-hover:scale-y-100 group-hover:opacity-100 group-hover:duration-300 group-hover:ease-[cubic-bezier(0.22,1,0.36,1)]"
      />
      <span className="flex min-w-0 items-center gap-3 transition-[translate] duration-500 ease-[cubic-bezier(0.37,0,0.18,1)] group-hover:translate-x-1 group-hover:duration-300 group-hover:ease-[cubic-bezier(0.22,1,0.36,1)]">
        <PlayerModerationAvatar avatar={penalty.avatar} name={penalty.player} status={penalty.moderationStatus} className="size-8 shrink-0 rounded-[9px] text-xs" />
        <span className="min-w-0 truncate text-[13px] font-medium text-[var(--text)]" title={penalty.player}>{penalty.player}</span>
      </span>
      <span><TypePill type={penalty.type} /></span>
      <span><StatusPill penalty={penalty} /></span>
      <span className="min-w-0 truncate text-[13px] text-[var(--text-2)]" title={reason}>{reason}</span>
      <TermLabel penalty={penalty} className="text-[13px] font-medium" />
      <span className="text-[13px] text-[var(--text-muted)]" title={formatPenaltyDate(penalty.date, true)}>{formatPenaltyDate(penalty.date)}</span>
      <ChevronRight className="size-4 text-[var(--text-faint)] transition-[translate,color] duration-500 ease-[cubic-bezier(0.37,0,0.18,1)] group-hover:translate-x-1 group-hover:text-[var(--text)] group-hover:duration-300" />
    </button>
  )
}

function GroupHeader({ label, active, count }: { label: string; active: boolean; count: number }) {
  return (
    <div className="flex h-9 items-center gap-2 border-b border-[var(--raised)] bg-[#0c0c0c] px-6 text-xs font-semibold text-[var(--text-muted)]">
      <span className={cn("size-1.5 rounded-full", active ? "lx-live-dot bg-[var(--status-red)]" : "bg-[var(--text-faint)]")} />
      {label}
      <span className="rounded-full bg-[var(--raised)] px-1.5 text-[11px] text-[var(--text-dim)]">{count}</span>
    </div>
  )
}

/** Summary cell that doubles as a filter: Active now, Bans, Mutes, Gags. */
function SummaryCell({ label, value, color, selected, pulse, onClick }: {
  label: string
  value: number | null
  color: string
  selected: boolean
  pulse?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{ "--tile": color } as CSSProperties}
      className={cn(
        "lx-stat-cell relative text-left transition-colors duration-200 hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-solid)]/50",
        selected && "bg-[color-mix(in_oklab,var(--tile)_10%,var(--card-surface))] hover:bg-[color-mix(in_oklab,var(--tile)_14%,var(--card-surface))]",
      )}
    >
      {selected && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-[var(--tile)]" />}
      <span className="lx-stat-label flex items-center gap-1.5">
        <span className={cn("size-1.5 rounded-full bg-[var(--tile)]", pulse && Boolean(value) && "lx-live-dot")} />
        {label}
      </span>
      <span className="text-xl font-semibold leading-none text-[var(--text)]"><AnimatedNumber value={value} /></span>
    </button>
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
  const [params, setParams] = useViewParams()
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

  // Search, filters and the open penalty are page state; a link may still carry them as a query
  // (e.g. ?q= from a profile), which is read once and then cleaned from the URL.
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
  const listRef = useFlip<HTMLDivElement>([...activeRows, ...historyRows].map((penalty) => penalty.id).join(","))
  const selected = openId ? [...all, ...(mine ?? [])].find((penalty) => penalty.id === openId) ?? null : null
  const isOwn = Boolean(selected && user && (selected.playerSteamId === user.steamId || (mine ?? []).some((penalty) => penalty.id === selected.id)))
  const firstLoad = loading && all.length === 0
  const activeTotal = found.filter((penalty) => penaltyStatus(penalty) === "active").length

  return (
    <div className="scrollbar-hidden flex min-h-0 flex-1 overflow-x-auto">
      <div className="flex min-w-[900px] flex-1 flex-col">
        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 px-6 pb-4 pt-6">
            <section aria-label="Penalties" className="relative overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent" />
              <div className="relative z-10 flex flex-col gap-5 p-7">
                <div className="flex items-end justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-2.5">
                    <h1 className="flex items-center gap-2.5 text-[34px] font-bold leading-[1.1] tracking-[-0.6px] text-[var(--text)]">
                      <span aria-hidden="true" className="h-7 w-1 rounded-full bg-[var(--text-faint)]" />
                      {PAGE_TITLES["penalties"]}
                      {loading && all.length > 0 && <LoaderCircle aria-label="Updating" className="size-4 animate-spin text-[var(--text-dim)]" />}
                    </h1>
                    <span className="text-[14px] text-[var(--text-2)]">Every ban, mute and gag on Legacy-X servers is public.</span>
                  </div>
                  {LINKS.serverRules && (
                    <a href={LINKS.serverRules} target="_blank" rel="noreferrer" className="group flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)]/70 px-3 text-[13px] text-[var(--text-2)] backdrop-blur transition-colors duration-300 hover:border-[var(--line-strong)] hover:text-[var(--text)]">
                      Server rules
                      <ExternalLink className="size-3.5 transition-[translate] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <label className="flex h-10 min-w-[260px] flex-1 items-center gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--panel)]/80 px-3 backdrop-blur transition-[border-color,box-shadow] duration-300 focus-within:border-[var(--text-dim)] focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand)_18%,transparent)]">
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
            </section>

            <div className="lx-stat-grid grid-cols-2 sm:grid-cols-4">
              <SummaryCell label="Active now" value={firstLoad ? null : activeTotal} color="var(--status-red)" pulse selected={status === "active" && type === "all"} onClick={() => update({ status: status === "active" && type === "all" ? null : "active", type: null })} />
              <SummaryCell label="Bans" value={firstLoad ? null : counts.ban} color={TYPE_META.ban.color} selected={type === "ban"} onClick={() => update({ type: type === "ban" ? null : "ban" })} />
              <SummaryCell label="Mutes" value={firstLoad ? null : counts.comm} color={TYPE_META.comm.color} selected={type === "comm"} onClick={() => update({ type: type === "comm" ? null : "comm" })} />
              <SummaryCell label="Gags" value={firstLoad ? null : counts.gag} color={TYPE_META.gag.color} selected={type === "gag"} onClick={() => update({ type: type === "gag" ? null : "gag" })} />
            </div>

            {user && <YourStatus penalties={mine ?? []} loading={mineLoading} onDetails={(penalty) => update({ penalty: penalty.id })} />}
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

          {/* Rows that stay glide to their new place when a filter changes; new ones cascade in. */}
          <div ref={listRef}>
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
                    <GroupHeader label="Active" active count={activeRows.length} />
                    {activeRows.map((penalty, index) => <PenaltyRow key={penalty.id} index={index} penalty={penalty} onOpen={() => update({ penalty: penalty.id })} />)}
                  </>
                )}
                {historyRows.length > 0 && (
                  <>
                    <GroupHeader label="History" active={false} count={historyRows.length} />
                    {historyRows.map((penalty, index) => <PenaltyRow key={penalty.id} index={activeRows.length + index} penalty={penalty} onOpen={() => update({ penalty: penalty.id })} />)}
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
