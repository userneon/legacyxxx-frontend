import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Gavel, MessageSquareOff, MicOff, RotateCcw, Search } from "lucide-react"

import { checksService, type PlayerCheck } from "@/api/checks"
import { moderationService } from "@/api/moderation"
import type { ModerationAccess, PenaltyKind } from "@/api/moderation-access"
import { searchService } from "@/api/search"
import type { PenaltyEntry } from "@/api/types"
import { PlayerAvatar } from "@/components/player-avatar"
import { formatRelativeTime } from "@/components/relative-time"
import { IssuePenaltyDialog } from "@/components/penalty-staff"
import { PenaltyDetailSheet, StatusPill, TermLabel, TypePill, penaltyStatus } from "@/components/penalty-detail-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"

/** Keys that open the penalty step from the case, unless someone is typing. */
const HOTKEYS: Record<string, PenaltyKind> = { b: "ban", m: "comm", g: "gag" }

function typing(target: EventTarget | null) {
  const element = target as HTMLElement | null
  return Boolean(element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.isContentEditable))
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
      <header className="flex items-baseline gap-2 border-b border-[var(--line-soft)] px-4 py-3">
        <span aria-hidden="true" className="h-3 w-[3px] shrink-0 self-center rounded-full bg-[var(--text-faint)]" />
        <h2 className="text-[13px] font-semibold text-[var(--text)]">{title}</h2>
        {hint && <span className="text-[12px] text-[var(--text-dim)]">{hint}</span>}
      </header>
      {children}
    </section>
  )
}

function checkLine(check: PlayerCheck) {
  if (check.status === "pending") return { title: "Waiting for the player", sub: `Asked ${formatRelativeTime(new Date(check.createdAt))}` }
  if (check.status === "expired") return { title: "The code ran out", sub: `Asked ${formatRelativeTime(new Date(check.createdAt))}` }
  const summary = check.summary
  const bits = [
    summary ? `${summary.detections} detection${summary.detections === 1 ? "" : "s"}` : null,
    summary && summary.suspicions > 0 ? `${summary.suspicions} suspicion${summary.suspicions === 1 ? "" : "s"}` : null,
    summary && (summary.bannedAccounts ?? 0) > 0 ? `${summary.bannedAccounts} banned account${summary.bannedAccounts === 1 ? "" : "s"}` : null,
    summary && !summary.matchesTarget ? "the asked player was not on that PC" : null,
  ].filter(Boolean)
  return { title: bits.length > 0 ? bits.join(" · ") : "Nothing found", sub: check.completedAt ? `Finished ${formatRelativeTime(new Date(check.completedAt))}` : "" }
}

/**
 * One player on one screen for staff: who they are, every penalty with who lifted it, what the checker found, and the
 * buttons to act (B ban, M mute, G gag). Nothing here is guessed: a number is a count of records, and a part with no
 * records says so.
 */
export function PlayerCase({ steamId, access, onBack, onFind, onChecks }: { steamId: string; access: ModerationAccess; onBack: () => void; onFind: () => void; onChecks: () => void }) {
  const [issuing, setIssuing] = useState<PenaltyKind | null>(null)
  const [picked, setPicked] = useState<PenaltyEntry | null>(null)
  const { data: all, loading, error, refetch } = useApiQuery<PenaltyEntry[]>((signal) => moderationService.getPenalties(undefined, { signal }), { queryKey: "staff-case-penalties" })
  const { data: checks } = useApiQuery<PlayerCheck[]>((signal) => checksService.list({ signal }), { queryKey: "staff-case-checks" })
  const penalties = useMemo(() => (all ?? []).filter((penalty) => penalty.playerSteamId === steamId), [all, steamId])
  const mine = useMemo(() => (checks ?? []).filter((check) => check.targetSteamId === steamId), [checks, steamId])
  const known = penalties[0]
  // A player with no penalty yet: ask the same search the Explore page uses for a name and picture.
  const { data: found } = useApiQuery<{ name: string; avatar: string } | null>(
    async (signal) => {
      const result = await searchService.searchPlayers(steamId, { signal })
      const player = result.players.find((candidate) => candidate.steamId === steamId)
      return player ? { name: player.name, avatar: player.avatar } : null
    },
    { enabled: !known && !loading, queryKey: `staff-case-search:${steamId}` },
  )
  const name = known?.player ?? found?.name ?? "Unknown player"
  const avatar = known?.avatar ?? found?.avatar ?? ""
  const active = penalties.filter((penalty) => penaltyStatus(penalty) === "active")
  const canPenalise = access.can.ban || access.can.edit || access.can.unban

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || typing(event.target) || issuing || picked) return
      if (document.querySelector("[role='dialog']")) return
      const kind = HOTKEYS[event.key.toLowerCase()]
      if (kind && canPenalise) { event.preventDefault(); setIssuing(kind) }
      else if (event.key === "/") { event.preventDefault(); onFind() }
      else if (event.key === "Escape" || event.key === "Backspace") { event.preventDefault(); onBack() }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [canPenalise, issuing, picked, onBack, onFind])

  return (
    <div className="flex flex-col gap-4 px-6 pb-8 pt-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-dim)] transition-colors hover:text-[var(--text)]"><ArrowLeft className="size-4" aria-hidden="true" />Players</button>
        <button type="button" onClick={onFind} className="ml-auto inline-flex h-8 items-center gap-2 rounded-lg border border-[var(--glass-line)] px-3 text-[13px] text-[var(--text-dim)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]"><Search className="size-3.5" aria-hidden="true" />Find another<kbd className="rounded border border-[var(--line)] px-1 text-[10px]">/</kbd></button>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-4">
        <PlayerAvatar avatar={avatar} name={name} className="size-14 shrink-0 rounded-2xl text-base" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-semibold text-[var(--text)]">{name}</p>
          <p className="mt-1 truncate font-mono text-[12px] text-[var(--text-dim)]">{steamId}</p>
          <p className="mt-2 text-[13px] text-[var(--text-2)]">
            {loading && !all ? "Loading…" : error ? "The penalties did not load." : `${penalties.length} penalt${penalties.length === 1 ? "y" : "ies"} on record · ${active.length} active`}
            {mine.length > 0 ? ` · ${mine.length} check${mine.length === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canPenalise && (
            <>
              <Button type="button" variant="outline" onClick={() => setIssuing("ban")}><Gavel className="size-4" aria-hidden="true" />Ban…<kbd className="ml-1 rounded border border-[var(--line)] px-1 text-[10px] text-[var(--text-dim)]">B</kbd></Button>
              <Button type="button" variant="outline" onClick={() => setIssuing("comm")}><MicOff className="size-4" aria-hidden="true" />Mute…<kbd className="ml-1 rounded border border-[var(--line)] px-1 text-[10px] text-[var(--text-dim)]">M</kbd></Button>
              <Button type="button" variant="outline" onClick={() => setIssuing("gag")}><MessageSquareOff className="size-4" aria-hidden="true" />Gag…<kbd className="ml-1 rounded border border-[var(--line)] px-1 text-[10px] text-[var(--text-dim)]">G</kbd></Button>
            </>
          )}
          <Button asChild variant="ghost"><Link to={`/profile/${steamId}`}>Open profile</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Section title="Penalties" hint={penalties.length > 0 ? "newest first" : undefined}>
          {error ? (
            <p className="flex items-center gap-3 px-4 py-4 text-[13px] text-[var(--text-dim)]">Could not load the penalties. <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" aria-hidden="true" />Retry</button></p>
          ) : loading && !all ? (
            <div className="flex flex-col gap-2 p-4" aria-hidden="true">{[0, 1, 2].map((row) => <Skeleton key={row} className="h-12 rounded-lg bg-[var(--glass-fill)]" />)}</div>
          ) : penalties.length === 0 ? (
            <p className="px-4 py-4 text-[13px] text-[var(--text-dim)]">No penalty has been issued to this player.</p>
          ) : (
            <ul>
              {penalties.map((penalty) => (
                <li key={penalty.id} className="border-b border-[var(--line-soft)] last:border-0">
                  <button type="button" onClick={() => setPicked(penalty)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--raised)]">
                    <TypePill type={penalty.type} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-[var(--text)]">{penalty.reason || "No reason given"}</span>
                      <span className="block truncate text-[12px] text-[var(--text-dim)]">
                        by {penalty.admin || "System"} · {formatRelativeTime(new Date(penalty.date))}
                        {penalty.isUnbanned ? ` · ${penalty.type === "ban" ? "unbanned" : "lifted"} by ${penalty.liftedBy ?? "not recorded"}` : ""}
                      </span>
                    </span>
                    <TermLabel penalty={penalty} className="text-[12px] font-medium" />
                    <StatusPill penalty={penalty} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Checker" hint={mine.length > 0 ? "latest first" : undefined}>
          {mine.length === 0 ? (
            <div className="flex flex-col items-start gap-3 px-4 py-4">
              <p className="text-[13px] text-[var(--text-dim)]">No check has been asked for this player.</p>
              <Button type="button" variant="outline" size="sm" onClick={onChecks}>Ask for a check</Button>
            </div>
          ) : (
            <ul>
              {[...mine].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((check) => {
                const line = checkLine(check)
                return (
                  <li key={check.id}>
                    <button type="button" onClick={onChecks} className="flex w-full flex-col gap-0.5 border-b border-[var(--line-soft)] px-4 py-3 text-left transition-colors last:border-0 hover:bg-[var(--raised)]">
                      <span className="text-[13px] font-semibold text-[var(--text)]">{line.title}</span>
                      <span className="text-[12px] text-[var(--text-dim)]">{line.sub}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Section>
      </div>

      <IssuePenaltyDialog open={issuing !== null} onOpenChange={(open) => { if (!open) setIssuing(null) }} access={access} onIssued={() => void refetch()} initialSteamId={steamId} initialType={issuing ?? "ban"} />
      <PenaltyDetailSheet penalty={picked} onClose={() => setPicked(null)} onProfileNavigate={() => undefined} onChanged={() => void refetch()} />
    </div>
  )
}
