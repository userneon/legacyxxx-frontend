import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { Search, ShieldAlert, Ban, MicOff, MessageSquareOff, Lock, X, ChevronRight, Shield, SearchX } from "lucide-react"

import { cn } from "@/lib/utils"
import { moderationService } from "@/api"
import type { PenaltyEntry, PenaltyStats, PenaltyType } from "@/api/types"
import { Button } from "@/components/ui/button"
import { useApiQuery } from "@/hooks/use-api-query"
import { QueryState } from "@/components/query-state"
import { RelativeTime } from "@/components/relative-time"
import { AnimatedNumber } from "@/components/animated-number"
import { PlayerModerationAvatar } from "@/components/player-moderation-avatar"
import { PlayerAvatar } from "@/components/player-avatar"
import { PenaltyDetailDialog, StatusPill, TypeIcon, TYPE_META, penaltyStatus } from "@/components/penalty-detail-dialog"

type PenaltyFilter = "all" | PenaltyType

const PAGE_SIZE = 20

function dayBucket(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Earlier"
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const days = Math.floor((startOfToday.getTime() - new Date(date).setHours(0, 0, 0, 0)) / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return "This week"
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function StatTile({ icon: Icon, label, value, tone, pulse }: { icon: typeof Ban; label: string; value: number | undefined; tone: string; pulse?: boolean }) {
  return (
    <div className="glass group relative min-w-[8.5rem] shrink-0 snap-start overflow-hidden rounded-2xl p-3.5 hover-lift @4xl:min-w-0 @4xl:p-4">
      <div className="flex items-center justify-between">
        <span className={cn("flex size-8 items-center justify-center rounded-lg bg-white/[0.05]", tone)}><Icon className="size-4" /></span>
        {pulse && Boolean(value) && <span className="penalty-active-dot size-2 rounded-full bg-emerald-300" />}
      </div>
      <div className={cn("mt-3 text-2xl font-bold tabular-nums", tone)}><AnimatedNumber value={value ?? null} fallback="0" /></div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function FilterTabs({ value, onChange, counts }: { value: PenaltyFilter; onChange: (value: PenaltyFilter) => void; counts: Record<PenaltyFilter, number> }) {
  const buttons = useRef<Partial<Record<PenaltyFilter, HTMLButtonElement | null>>>({})
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)
  const items: { id: PenaltyFilter; label: string; icon: typeof Ban }[] = [
    { id: "all", label: "All", icon: ShieldAlert },
    { id: "ban", label: "Bans", icon: Ban },
    { id: "comm", label: "Mutes", icon: MicOff },
    { id: "gag", label: "Gags", icon: MessageSquareOff },
  ]
  const countsKey = items.map((item) => counts[item.id]).join(",")

  useLayoutEffect(() => {
    const active = buttons.current[value]
    if (active) setIndicator({ left: active.offsetLeft, width: active.offsetWidth })
  }, [value, countsKey])

  return (
    <div className="scrollbar-hidden relative inline-flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-secondary/30 p-1" role="tablist">
      {indicator && <span className="filter-tab-indicator absolute inset-y-1 rounded-lg bg-secondary shadow-sm" style={{ left: indicator.left, width: indicator.width }} aria-hidden="true" />}
      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            ref={(node) => { buttons.current[item.id] = node }}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn("relative z-10 flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors", active ? "text-foreground" : "text-foreground/60 hover:text-foreground")}
          >
            <item.icon className="size-3.5" />
            {item.label}
            <span key={counts[item.id]} className={cn("count-bump rounded px-1 py-0.5 text-[10px] tabular-nums", active ? "bg-muted text-muted-foreground" : "text-foreground/45")}>{counts[item.id]}</span>
          </button>
        )
      })}
    </div>
  )
}

function PenaltyRow({ penalty, onOpen }: { penalty: PenaltyEntry; onOpen: () => void }) {
  const status = penaltyStatus(penalty)
  const meta = TYPE_META[penalty.type] ?? TYPE_META.ban
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-white/[0.05] px-4 py-3 text-left transition-colors hover:bg-white/[0.03] focus-visible:bg-white/[0.04] focus-visible:outline-none",
        "@3xl:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1.5fr)_7.5rem_minmax(0,0.9fr)_8.5rem_1rem]",
        status !== "active" && "opacity-70"
      )}
    >
      <TypeIcon type={penalty.type} />

      {/* Player + (on narrow screens) reason */}
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <PlayerModerationAvatar avatar={penalty.avatar} name={penalty.player} status={penalty.moderationStatus} className="size-6 rounded-md text-[9px]" />
          <span className="truncate text-sm font-semibold">{penalty.player}</span>
          <span className={cn("hidden shrink-0 rounded border px-1.5 py-px text-[10px] font-bold uppercase @md:inline", meta.tone)}>{meta.label}</span>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground @3xl:hidden">{penalty.reason || "No reason given"}</p>
      </div>

      {/* Narrow: status + date stacked on the right */}
      <div className="flex flex-col items-end gap-1 @3xl:hidden">
        <StatusPill status={status} />
        <RelativeTime value={penalty.date} prefix="Issued " className="text-[11px] text-muted-foreground" />
      </div>

      {/* Wide columns */}
      <p className="hidden truncate text-sm text-white/80 @3xl:block">{penalty.reason || <span className="text-muted-foreground">No reason given</span>}</p>
      <span className="hidden items-center gap-1.5 text-xs text-muted-foreground @3xl:flex">
        {penalty.isPermanent
          ? <><Lock className="size-3 shrink-0 text-destructive" /><span className="text-white/80">Permanent</span></>
          : <span className="truncate tabular-nums">{penalty.term || "—"}</span>}
      </span>
      <span className="hidden min-w-0 items-center gap-2 text-xs text-muted-foreground @3xl:flex">
        {penalty.admin
          ? <PlayerAvatar avatar={penalty.adminAvatar} name={penalty.admin} className="size-5 shrink-0 rounded-md text-[8px]" />
          : <Shield className="size-3 shrink-0" />}
        <span className="truncate">{penalty.admin || "System"}</span>
      </span>
      <div className="hidden flex-col items-start gap-1 @3xl:flex">
        <StatusPill status={status} />
        <RelativeTime value={penalty.date} prefix="Issued " className="text-[11px] text-muted-foreground" />
      </div>
      <ChevronRight className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 @3xl:block" />
    </button>
  )
}

export function PenaltiesPage({ onProfileNavigate }: { onProfileNavigate: (userId: string) => void }) {
  const [filter, setFilter] = useState<PenaltyFilter>("all")
  const [activeOnly, setActiveOnly] = useState(false)
  const [query, setQuery] = useState("")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [selected, setSelected] = useState<PenaltyEntry | null>(null)

  const { data: penalties, loading, error, refetch } = useApiQuery<PenaltyEntry[]>((signal) =>
    moderationService.getPenalties(undefined, { signal }),
  )
  const { data: stats } = useApiQuery<PenaltyStats>((signal) => moderationService.getStats({ signal }))

  const allPenalties = useMemo(
    () => [...(penalties ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [penalties],
  )

  const q = query.trim().toLowerCase()
  const base = allPenalties.filter((penalty) =>
    (!q || [penalty.player, penalty.reason, penalty.admin].some((field) => String(field ?? "").toLowerCase().includes(q))) &&
    (!activeOnly || penaltyStatus(penalty) === "active"),
  )
  const counts: Record<PenaltyFilter, number> = {
    all: base.length,
    ban: base.filter((penalty) => penalty.type === "ban").length,
    comm: base.filter((penalty) => penalty.type === "comm").length,
    gag: base.filter((penalty) => penalty.type === "gag").length,
  }
  const filtered = filter === "all" ? base : base.filter((penalty) => penalty.type === filter)
  const visible = filtered.slice(0, visibleCount)
  const groups = visible.reduce<{ label: string; items: PenaltyEntry[] }[]>((acc, penalty) => {
    const label = dayBucket(penalty.date)
    const last = acc[acc.length - 1]
    if (last && last.label === label) last.items.push(penalty)
    else acc.push({ label, items: [penalty] })
    return acc
  }, [])
  const narrowed = Boolean(q) || activeOnly || filter !== "all"

  const resetFilters = () => {
    setQuery("")
    setActiveOnly(false)
    setFilter("all")
  }

  return (
    <div className="@container flex flex-col gap-5 p-4 @2xl:p-6">
      <section className="glass relative overflow-hidden rounded-2xl p-5 @2xl:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-destructive/[0.10] blur-3xl" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-destructive/25 bg-destructive/10 text-destructive"><ShieldAlert className="size-5" /></span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight @2xl:text-2xl">Penalties</h1>
            <p className="text-sm text-muted-foreground">Public record of bans, mutes and gags on LEGACY-X servers.</p>
          </div>
        </div>
      </section>

      {/* One swipeable row on narrow screens instead of a tall stack; a 5-column grid when there is room. */}
      <div className="stagger-in scrollbar-hidden -mx-4 -my-1 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 py-1 @2xl:-mx-6 @2xl:scroll-px-6 @2xl:px-6 @4xl:mx-0 @4xl:grid @4xl:grid-cols-5 @4xl:overflow-visible @4xl:px-0">
        <StatTile icon={Ban} label="Total bans" value={stats?.totalBans} tone="text-destructive" />
        <StatTile icon={ShieldAlert} label="Active bans" value={stats?.activeBans} tone="text-emerald-300" pulse />
        <StatTile icon={Lock} label="Permanent" value={stats?.permanentBans} tone="text-rose-300" />
        <StatTile icon={MicOff} label="Mutes" value={stats?.totalComms} tone="text-amber-200" />
        <StatTile icon={MessageSquareOff} label="Gags" value={stats?.totalGags} tone="text-sky-200" />
      </div>

      <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-center @3xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <FilterTabs value={filter} onChange={(value) => { setFilter(value); setVisibleCount(PAGE_SIZE) }} counts={counts} />
          <button
            type="button"
            aria-pressed={activeOnly}
            onClick={() => { setActiveOnly((on) => !on); setVisibleCount(PAGE_SIZE) }}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-colors",
              activeOnly ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-secondary/30 text-foreground/60 hover:text-foreground"
            )}
          >
            <span className={cn("size-1.5 rounded-full", activeOnly ? "penalty-active-dot bg-emerald-300" : "bg-white/30")} />
            Active only
          </button>
        </div>

        <label className="glass flex h-10 w-full items-center gap-2 rounded-xl px-3 transition-colors focus-within:border-white/25 @3xl:max-w-xs">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search player, reason or admin"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE) }}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="rounded-md p-0.5 text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          )}
        </label>
      </div>

      <section className="glass overflow-hidden rounded-2xl">
        <div className="hidden grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1.5fr)_7.5rem_minmax(0,0.9fr)_8.5rem_1rem] gap-x-3 border-b border-white/[0.06] px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground @3xl:grid">
          <span className="w-9" />
          <span>Player</span>
          <span>Reason</span>
          <span>Duration</span>
          <span>Issued by</span>
          <span>Status</span>
          <span />
        </div>

        {loading && !penalties ? (
          <div className="flex flex-col">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-3">
                <div className="size-9 animate-pulse rounded-xl bg-white/[0.06]" />
                <div className="flex-1 space-y-2"><div className="h-3.5 w-40 animate-pulse rounded bg-white/[0.06]" /><div className="h-3 w-64 max-w-full animate-pulse rounded bg-white/[0.04]" /></div>
                <div className="h-6 w-16 animate-pulse rounded-full bg-white/[0.06]" />
              </div>
            ))}
          </div>
        ) : error && !penalties ? (
          <QueryState loading={false} error={error} onRetry={refetch} className="rounded-none border-0 bg-transparent" />
        ) : filtered.length === 0 ? (
          <div className="query-state-in flex flex-col items-center gap-3 px-4 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-white/[0.04]">{narrowed ? <SearchX className="size-5 text-muted-foreground" /> : <ShieldAlert className="size-5 text-emerald-300" />}</span>
            <p className="text-sm font-medium">{narrowed ? "No penalties match these filters" : "No penalties on record"}</p>
            <p className="max-w-xs text-xs text-muted-foreground">{narrowed ? "Try another search or show every penalty type." : "Every LEGACY-X player is currently in good standing."}</p>
            {narrowed && <Button variant="outline" size="sm" onClick={resetFilters}>Clear filters</Button>}
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <div key={group.label}>
                <div className="border-b border-white/[0.05] bg-white/[0.02] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </div>
                <div className="stagger-in">
                  {group.items.map((penalty) => <PenaltyRow key={penalty.id} penalty={penalty} onOpen={() => setSelected(penalty)} />)}
                </div>
              </div>
            ))}
            {filtered.length > visible.length && (
              <div className="p-3">
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                  Show more ({filtered.length - visible.length} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <PenaltyDetailDialog penalty={selected} onClose={() => setSelected(null)} onProfileNavigate={onProfileNavigate} />
    </div>
  )
}
