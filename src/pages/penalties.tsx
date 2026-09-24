/**
 * Penalties (docs/design/penalties, penalties-details, penalties-my-active). The page answers, in order:
 * "Am I penalized?", "Is this player penalized?", "What happened on the servers?". Filters, search and the open
 * drawer are in the URL, so a link can point at one penalty.
 */
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight, ChevronRight, Search, ShieldAlert, ShieldCheck, X } from "lucide-react"

import { moderationService, profileService, type PenaltyEntry, type PenaltyStats, type PenaltyType } from "@/api"
import { DISCORD_APPEALS_URL, SERVER_RULES_URL } from "@/lib/config"
import { formatDate, formatDateTime, formatDuration } from "@/lib/format"
import { profilePath } from "@/lib/routes"
import { normalizePlayerQuery } from "@/lib/steam"
import { cn } from "@/lib/utils"
import { Card, PageHeader, SearchField } from "@/components/page"
import { PlayerAvatar } from "@/components/player-avatar"
import { EmptyState, ErrorState, InlineLoader, Skeleton } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Segmented } from "@/components/ui/segmented"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { useDebounced } from "@/hooks/use-debounced"
import { useIncremental } from "@/hooks/use-incremental"
import { useUrlState } from "@/hooks/use-url-state"

type TypeFilter = "all" | PenaltyType
type StatusFilter = "all" | "active"
export type PenaltyStatus = "Active" | "Permanent" | "Expired" | "Unbanned"

const TYPE_LABEL: Record<PenaltyType, string> = { ban: "Ban", comm: "Mute", gag: "Gag" }
const COLUMNS = "grid grid-cols-[minmax(0,1fr)_64px_20px] @4xl:grid-cols-[minmax(200px,1.1fr)_80px_minmax(220px,1.6fr)_120px_100px_20px] gap-4 items-center px-4 @4xl:px-6"

export function penaltyStatus(penalty: PenaltyEntry, now = Date.now()): PenaltyStatus {
  if (penalty.isUnbanned) return "Unbanned"
  if (penalty.isPermanent) return "Permanent"
  const expires = penalty.expiresAt ? Date.parse(penalty.expiresAt) : Number.NaN
  if (Number.isFinite(expires) && expires <= now) return "Expired"
  return "Active"
}

const isActive = (penalty: PenaltyEntry) => {
  const status = penaltyStatus(penalty)
  return status === "Active" || status === "Permanent"
}

function termLabel(penalty: PenaltyEntry) {
  if (penalty.isPermanent) return "Permanent"
  return penalty.term || "—"
}

/** "Ends in 2d 4h" for a running temporary penalty. */
function endsIn(penalty: PenaltyEntry) {
  if (penalty.isPermanent || penalty.isUnbanned || !penalty.expiresAt) return null
  const remaining = Date.parse(penalty.expiresAt) - Date.now()
  return remaining > 0 ? `Ends in ${formatDuration(remaining)}` : null
}

function TypePill({ type }: { type: PenaltyType }) {
  return <span className="inline-flex h-5 items-center rounded-full border border-line bg-raised px-2 text-[11px] font-medium text-text-2">{TYPE_LABEL[type] ?? type}</span>
}

function YourStatus({ onOpen }: { onOpen: (id: string) => void }) {
  const { user } = useAuth()
  const { data, loading, error } = useApiQuery<PenaltyEntry[]>((signal) => profileService.getPenalties("me", { signal }), { enabled: Boolean(user), queryKey: user?.id ?? "guest" })
  if (!user) return null
  if (loading && !data) {
    return (
      <Card className="flex items-center gap-3.5 px-[18px] py-4" aria-busy="true">
        <Skeleton className="size-10 rounded-[10px]" />
        <span className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-48 bg-line" />
          <Skeleton className="h-2.5 w-64" />
        </span>
      </Card>
    )
  }
  if (error || !data) return null
  const active = data.filter(isActive)
  if (active.length === 0) {
    return (
      <section aria-label="Your status" className="flex items-center gap-3.5 rounded-xl border border-line-soft bg-card px-[18px] py-4 animate-fade-in">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-live/10 text-live">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <span className="flex flex-col gap-[3px]">
          <span className="text-sm font-semibold text-text">Your record is clean</span>
          <span className="text-[13px] text-text-muted">No active penalties on your account.</span>
        </span>
      </section>
    )
  }
  const current = active[0]
  return (
    <section aria-label="Your status" className="flex flex-col gap-3.5 rounded-xl border border-accent/45 bg-card px-[18px] py-4 sm:flex-row sm:items-center animate-fade-in">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-accent/10 text-accent">
        <ShieldAlert className="size-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-sm font-semibold text-text">You have an active penalty{active.length > 1 ? ` (+${active.length - 1} more)` : ""}</span>
        <span className="flex min-w-0 items-center gap-2 text-[13px] text-text-muted">
          <span className="shrink-0 font-medium text-text-2">{TYPE_LABEL[current.type]}</span>
          <span className="truncate" title={current.reason}>{current.reason || "No reason given"}</span>
          <span className="shrink-0 text-text-dim">· {endsIn(current) ?? termLabel(current)}</span>
        </span>
      </span>
      <span className="flex shrink-0 gap-2">
        <Button variant="outline" className="h-9 px-3.5" onClick={() => onOpen(current.id)}>Details</Button>
        <Button asChild className="h-9 px-3.5">
          <a href={DISCORD_APPEALS_URL} target="_blank" rel="noreferrer">Appeal on Discord</a>
        </Button>
      </span>
    </section>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex h-10 items-center justify-between gap-4 border-b border-line-soft">
      <span className="text-[13px] text-text-muted">{label}</span>
      <span className="min-w-0 truncate text-right text-[13px] text-text">{children}</span>
    </div>
  )
}

function PenaltyDrawer({ penaltyId, known, onClose }: { penaltyId: string | null; known: PenaltyEntry | undefined; onClose: () => void }) {
  const { user } = useAuth()
  const { data, loading, error, refetch } = useApiQuery<PenaltyEntry>((signal) => moderationService.getPenalty(penaltyId!, { signal }), {
    enabled: Boolean(penaltyId) && !known,
    queryKey: penaltyId ?? "",
  })
  const penalty = known ?? data
  const own = Boolean(user && penalty?.playerSteamId && penalty.playerSteamId === user.steamId)
  const status = penalty ? penaltyStatus(penalty) : null

  return (
    <Sheet open={Boolean(penaltyId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full p-0 sm:max-w-[400px]" showCloseButton>
        {penalty ? (
          <>
            <div className="flex items-center gap-3 border-b border-line-soft p-[18px] pr-14">
              <PlayerAvatar avatar={penalty.avatar} name={penalty.player} size={44} />
              <span className="flex min-w-0 flex-col gap-1">
                <SheetTitle className="m-0 truncate text-[15px] font-semibold text-text">{penalty.player || "Unknown player"}</SheetTitle>
                <SheetDescription className="m-0 truncate text-xs text-text-dim select-text">{penalty.playerSteamId ?? "SteamID unavailable"}</SheetDescription>
              </span>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto px-[18px] pt-2 pb-[18px]">
              <DetailRow label="Type">{TYPE_LABEL[penalty.type]}</DetailRow>
              <DetailRow label="Status">
                <span className="inline-flex items-center gap-1.5">
                  {(status === "Active" || status === "Permanent") && <span className="size-1.5 rounded-full bg-accent" aria-hidden />}
                  {status}
                </span>
              </DetailRow>
              <DetailRow label="Term">{endsIn(penalty) ? `${termLabel(penalty)} · ${endsIn(penalty)}` : termLabel(penalty)}</DetailRow>
              <DetailRow label="Issued by">{penalty.admin || "—"}</DetailRow>
              <DetailRow label="Date">{formatDateTime(penalty.date)}</DetailRow>
              <div className="flex flex-col gap-2 py-4">
                <span className="text-[13px] text-text-muted">Reason</span>
                <p className="m-0 rounded-[10px] border border-line-soft bg-card p-3 text-[13px] leading-5 whitespace-pre-wrap text-text-2 select-text">{penalty.reason || "No reason given."}</p>
              </div>
            </div>
            <div className="flex gap-2 border-t border-line-soft px-[18px] py-3.5">
              {penalty.playerSteamId && (
                <Button asChild variant="outline" className="h-9 flex-1">
                  <Link to={profilePath(penalty.playerSteamId, user)} onClick={onClose}>View profile</Link>
                </Button>
              )}
              {own && isActive(penalty) && (
                <Button asChild className="h-9 flex-1">
                  <a href={DISCORD_APPEALS_URL} target="_blank" rel="noreferrer">Appeal on Discord</a>
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <SheetTitle className="sr-only">Penalty details</SheetTitle>
            <SheetDescription className="sr-only">Loading penalty</SheetDescription>
            {loading ? (
              <div className="flex flex-col gap-3 p-[18px]" aria-busy="true">
                <span className="flex items-center gap-3">
                  <Skeleton className="size-11 rounded-xl" />
                  <span className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3 w-1/2 bg-line" />
                    <Skeleton className="h-2.5 w-2/5" />
                  </span>
                </span>
              </div>
            ) : (
              <ErrorState message={error?.status === 404 ? "This penalty no longer exists." : undefined} onRetry={error?.status === 404 ? undefined : refetch} className="mt-10" />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function PenaltyRow({ penalty, onOpen }: { penalty: PenaltyEntry; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className={cn(COLUMNS, "h-14 w-full border-b border-raised text-left transition-colors duration-150 hover:bg-card")}>
      <span className="flex min-w-0 items-center gap-3">
        <PlayerAvatar avatar={penalty.avatar} name={penalty.player} size={32} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] font-medium text-text" title={penalty.player}>{penalty.player || "Unknown player"}</span>
          <span className="truncate text-xs text-text-dim @4xl:hidden" title={penalty.reason}>{penalty.reason}</span>
        </span>
      </span>
      <span>
        <TypePill type={penalty.type} />
      </span>
      <span className="hidden truncate text-[13px] text-text-2 @4xl:block" title={penalty.reason}>{penalty.reason || "—"}</span>
      <span className="hidden truncate text-[13px] text-text-2 @4xl:block">{termLabel(penalty)}</span>
      <span className="hidden text-[13px] text-text-muted tabular-nums @4xl:block">{formatDate(penalty.date, { day: "numeric", month: "short" })}</span>
      <ChevronRight className="size-4 text-text-faint" aria-hidden />
    </button>
  )
}

function GroupHeader({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex h-9 items-center gap-2 border-b border-raised bg-[#0c0c0c] px-4 text-xs font-semibold text-text-muted @4xl:px-6">
      <span className={cn("size-1.5 rounded-full", active ? "bg-accent" : "bg-text-faint")} aria-hidden />
      {label}
    </div>
  )
}

export function PenaltiesPage() {
  const [type, setType] = useUrlState<TypeFilter>("type", "all", ["all", "ban", "comm", "gag"])
  const [status, setStatus] = useUrlState<StatusFilter>("status", "all", ["all", "active"])
  const [urlQuery, setUrlQuery] = useUrlState("q", "")
  const [openId, setOpenId] = useUrlState("penalty", "")
  const [admin, setAdmin] = useUrlState("admin", "")
  const [draft, setDraft] = useState(urlQuery)
  const query = useDebounced(normalizePlayerQuery(draft), 250)
  useEffect(() => {
    if (query !== urlQuery) setUrlQuery(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const { data: stats } = useApiQuery<PenaltyStats>((signal) => moderationService.getStats({ signal }))
  const { data, loading, error, refetch } = useApiQuery<PenaltyEntry[]>(
    (signal) => moderationService.getPenalties({ type: type === "all" ? undefined : type, query: urlQuery || undefined, admin: admin || undefined }, { signal }),
    { queryKey: `${type}|${urlQuery}|${admin}`, keepPreviousData: true },
  )

  const { active, history } = useMemo(() => {
    const entries = data ?? []
    return { active: entries.filter(isActive), history: status === "active" ? [] : entries.filter((entry) => !isActive(entry)) }
  }, [data, status])
  const rows = useMemo(() => [...active.map((entry) => ({ entry, group: "active" as const })), ...history.map((entry) => ({ entry, group: "history" as const }))], [active, history])
  const { count, sentinelRef, hasMore } = useIncremental(rows.length, 100, `${type}|${status}|${urlQuery}`)
  const visible = rows.slice(0, count)
  const firstHistory = visible.findIndex((row) => row.group === "history")
  const known = data?.find((entry) => entry.id === openId)

  const counts = stats
    ? { all: stats.totalBans + stats.totalComms + stats.totalGags, ban: stats.totalBans, comm: stats.totalComms, gag: stats.totalGags }
    : null

  return (
    <div className="@container flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-[18px] px-4 pt-6 pb-4 @4xl:px-6">
          <PageHeader
            title={
              <span className="inline-flex items-center gap-2">
                Penalties
                <InlineLoader show={loading && Boolean(data)} />
              </span>
            }
            subtitle="Every ban, mute and gag on Legacy-X servers is public."
            actions={
              <a href={SERVER_RULES_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[13px] text-text-muted transition-colors duration-150 hover:text-text">
                Server rules
                <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
            }
          />
          <YourStatus onOpen={setOpenId} />
          <div className="flex flex-wrap items-center gap-2.5">
            <SearchField
              icon={<Search className="size-4 shrink-0" aria-hidden />}
              aria-label="Search player"
              placeholder="Check a player — name, Steam ID or profile link"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="h-10 min-w-[260px] flex-1"
            />
            <Segmented
              ariaLabel="Type"
              value={type}
              onChange={setType}
              options={[
                { value: "all", label: "All", count: counts?.all },
                { value: "ban", label: "Bans", count: counts?.ban },
                { value: "comm", label: "Mutes", count: counts?.comm },
                { value: "gag", label: "Gags", count: counts?.gag },
              ]}
            />
            {admin && (
              <button
                type="button"
                onClick={() => setAdmin("")}
                className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-line-strong bg-line px-3 text-xs font-medium text-text transition-colors duration-150 hover:bg-line-strong"
              >
                Issued by {admin}
                <X className="size-3.5" aria-label="Clear" />
              </button>
            )}
            <Segmented
              ariaLabel="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active only" },
              ]}
            />
          </div>
        </div>

        <div className={cn(COLUMNS, "sticky top-0 z-[2] h-[38px] border-y border-line-soft bg-panel text-xs font-medium text-text-dim")}>
          <span>Player</span>
          <span>Type</span>
          <span className="hidden @4xl:block">Reason</span>
          <span className="hidden @4xl:block">Term</span>
          <span className="hidden @4xl:block">Date</span>
          <span />
        </div>

        {loading && !data ? (
          <div aria-busy="true" aria-label="Loading penalties">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className={cn(COLUMNS, "h-14 border-b border-raised")}>
                <span className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-[9px]" />
                  <Skeleton className="h-2.5 w-1/2 bg-line" />
                </span>
                <Skeleton className="h-5 w-12 bg-raised" />
                <Skeleton className="hidden h-2.5 w-3/4 @4xl:block" />
                <Skeleton className="hidden h-2.5 w-16 @4xl:block" />
                <Skeleton className="hidden h-2.5 w-14 @4xl:block" />
                <span />
              </div>
            ))}
          </div>
        ) : error && !data ? (
          <ErrorState onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState>{urlQuery ? `No penalties for "${urlQuery}".` : status === "active" ? "No active penalties right now." : "No penalties yet."}</EmptyState>
        ) : (
          <div key={`${type}|${status}|${urlQuery}`} className={cn("animate-fade-in transition-opacity duration-150", loading && "opacity-70")}>
            {active.length > 0 && <GroupHeader label="Active" active />}
            {visible.map((row, index) => (
              <div key={row.entry.id}>
                {index === firstHistory && <GroupHeader label="History" active={false} />}
                <PenaltyRow penalty={row.entry} onOpen={() => setOpenId(row.entry.id)} />
              </div>
            ))}
            {hasMore && <div ref={sentinelRef} className="h-px" aria-hidden />}
          </div>
        )}
      </div>

      <PenaltyDrawer penaltyId={openId || null} known={known} onClose={() => setOpenId("")} />
    </div>
  )
}
