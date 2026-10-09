import { useEffect, useMemo, useState } from "react"
import { Check, ChevronRight, Clock, Download, MessageSquareShare, Plus, RotateCcw, Search, ShieldAlert, Trash2, TriangleAlert, UserSearch } from "lucide-react"
import { toast } from "sonner"

import { checksService, type CheckFinding, type CheckReport, type PlayerCheck, type PlayerCheckDetail } from "@/api/checks"
import type { ApiError } from "@/api/types"
import { NewCheckDialog } from "@/components/new-check-dialog"
import { PageBar, PageBarEnd, PageTabs, pageSearchClass } from "@/components/page-tabs"
import { PlayerAvatar } from "@/components/player-avatar"
import { LINKS } from "@/lib/links"
import { RelativeTime } from "@/components/relative-time"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

const KIND: Record<CheckFinding["kind"], string> = { file: "File", process: "Process", trace: "Trace", steam: "Steam", tamper: "Tampering" }



function formatDay(iso?: string | null) {
  if (!iso) return "unknown"
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? "unknown" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

/** The Steam accounts on the PC: who they are, when they last signed in and played CS2, and what Steam says about their bans. */
function SteamAccounts({ report, targetSteamId }: { report: CheckReport; targetSteamId: string }) {
  const accounts = report.steamAccounts ?? []
  const bans = new Map((report.steamBans ?? []).map((ban) => [ban.steamId, ban]))
  // The asked player's own account is shown even when it was not found on the PC.
  const ids = Array.from(new Set([...accounts.map((account) => account.steamId), targetSteamId]))
  if (ids.length === 0) return null
  return (
    <section className="flex flex-col gap-1.5" aria-label="Steam accounts">
      <h3 className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">Steam accounts on this PC <span className="text-[var(--text-faint)]">{accounts.length}</span></h3>
      <ul className="flex flex-col gap-1.5">
        {ids.map((steamId) => {
          const account = accounts.find((entry) => entry.steamId === steamId)
          const ban = bans.get(steamId)
          const banned = Boolean(ban && (ban.vacBanned || ban.gameBans > 0))
          const asked = steamId === targetSteamId
          return (
            <li key={steamId} className="rounded-lg border border-[var(--line-soft)] bg-[var(--card-surface)] px-3 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="min-w-0 truncate text-[13px] font-semibold text-[var(--text)]">{account?.personaName || ban?.personaName || steamId}</span>
                {asked && <span className="rounded-md border border-[var(--line)] px-1.5 py-px text-[10px] text-[var(--text-muted)]">Asked player</span>}
                {account?.mostRecent && <span className="rounded-md border border-[var(--line)] px-1.5 py-px text-[10px] text-[var(--text-muted)]">Last used</span>}
                {!account && <span className="rounded-md border border-[var(--line)] px-1.5 py-px text-[10px] text-[var(--text-dim)]">Not found on this PC</span>}
                {ban?.vacBanned && <span className="rounded-md border border-[var(--status-red)]/50 px-1.5 py-px text-[10px] font-semibold text-[var(--status-red)]">VAC ban</span>}
                {ban && ban.gameBans > 0 && <span className="rounded-md border border-[var(--status-red)]/50 px-1.5 py-px text-[10px] font-semibold text-[var(--status-red)]">{ban.gameBans} game {ban.gameBans === 1 ? "ban" : "bans"}</span>}
                {ban?.communityBanned && <span className="rounded-md border border-[var(--line)] px-1.5 py-px text-[10px] text-[var(--text-2)]">Community ban</span>}
                {ban && !banned && <span className="rounded-md border border-[var(--line)] px-1.5 py-px text-[10px] text-[var(--text-dim)]">No VAC or game ban</span>}
              </div>
              <p className="mt-0.5 truncate text-[11px] text-[var(--text-dim)]">{steamId}{account?.accountName ? ` · login ${account.accountName}` : ""}</p>
              {account && (
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  Signed in {formatDay(account.lastLogin)} · CS2 last played {formatDay(account.cs2LastPlayed)}{account.cs2Hours != null ? ` · ${account.cs2Hours.toLocaleString()} h` : ""}
                </p>
              )}
              {ban?.daysSinceLastBan != null && <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Last ban {ban.daysSinceLastBan.toLocaleString()} days ago.</p>}
              {ban?.createdAt && <p className="mt-0.5 text-[11px] text-[var(--text-dim)]">Account made {formatDay(ban.createdAt)}{ban.profilePublic === false ? " · profile is private" : ""}</p>}
              {account?.launchOptions && <p className="mt-0.5 truncate text-[11px] text-[var(--text-dim)]" title={account.launchOptions}>CS2 launch options: {account.launchOptions}</p>}
            </li>
          )
        })}
      </ul>
      {report.cs2 && <p className="text-[11px] text-[var(--text-dim)]">CS2 {report.cs2.installed ? `is installed${report.cs2.lastUpdated ? `, last updated ${formatDay(report.cs2.lastUpdated)}` : ""}.` : "is not installed on this PC."}</p>}
    </section>
  )
}

function Detail({ id, onClose, onRemoved }: { id: string; onClose: () => void; onRemoved: () => void }) {
  const { data, loading, error, refetch } = useApiQuery<PlayerCheckDetail>((signal) => checksService.get(id, { signal }), { queryKey: `check:${id}` })
  const [busy, setBusy] = useState(false)
  const remove = async () => {
    if (!window.confirm("Remove this check and its result for good?")) return
    setBusy(true)
    try { await checksService.remove(id); onRemoved(); onClose() } catch (caught) { toast.error("Could not remove it", { description: (caught as Partial<ApiError>)?.status === 403 ? "An Admin can only remove their own checks." : "Try again in a moment." }) } finally { setBusy(false) }
  }
  const report = data?.report ?? null
  const detections = report?.findings.filter((finding) => finding.confidence === "detection") ?? []
  const suspicions = report?.findings.filter((finding) => finding.confidence === "suspicion") ?? []
  const group = (title: string, list: CheckFinding[]) => list.length > 0 && (
    <section className="flex flex-col gap-1.5" aria-label={title}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">{title} <span className="text-[var(--text-faint)]">{list.length}</span></h3>
      <ul className="flex flex-col gap-1.5">
        {list.map((finding, index) => (
          <li key={`${finding.name}:${index}`} className="rounded-lg border border-[var(--line-soft)] bg-[var(--card-surface)] px-3 py-2">
            <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--text)]">{finding.name}</span><span className="shrink-0 rounded-md border border-[var(--line)] px-1.5 py-px text-[10px] text-[var(--text-muted)]">{KIND[finding.kind]}</span></div>
            {finding.path && <p className="mt-0.5 truncate text-[11px] text-[var(--text-dim)]" title={finding.path}>{finding.path}</p>}
            {finding.note && <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{finding.note}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3.5 pr-6">
            {data && <PlayerAvatar avatar={data.targetAvatar ?? undefined} name={data.targetName ?? data.targetSteamId} className="size-12 rounded-xl text-base" />}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <DialogTitle className="truncate">{data ? data.targetName ?? "Not on LEGACY-X" : "Check"}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">{data ? <><StatusPill check={data} /><span>asked by {data.requestedBy}</span></> : "Loading…"}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {loading && !data ? <Skeleton className="h-40 rounded-xl" /> : error || !data ? (
          <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load this check.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
        ) : !report ? (
          <p className="text-[13px] text-[var(--text-dim)]">{data.status === "pending" ? "The player has not run the checker yet. The code ends at the time shown in the list." : "No result: the code ended before the player used it."}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {(report.detections > 0 || (report.steamBans ?? []).some((ban) => ban.vacBanned || ban.gameBans > 0)) && (
              <p className="flex items-start gap-2 rounded-lg border border-[var(--status-red)]/40 bg-[var(--status-red)]/10 px-3 py-2 text-xs text-[var(--text-2)]"><ShieldAlert className="mt-px size-4 shrink-0 text-[var(--status-red)]" aria-hidden="true" />This check needs a person to look at it: {report.detections > 0 ? `${report.detections} ${report.detections === 1 ? "detection" : "detections"}` : ""}{report.detections > 0 && (report.steamBans ?? []).some((ban) => ban.vacBanned || ban.gameBans > 0) ? " and " : ""}{(report.steamBans ?? []).some((ban) => ban.vacBanned || ban.gameBans > 0) ? "a banned Steam account" : ""}.</p>
            )}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-[var(--line-soft)] px-2 py-2"><b className={cn("block text-xl", report.detections > 0 && "text-[var(--status-red)]")}>{report.detections}</b><span className="text-[11px] text-[var(--text-dim)]">detections</span></div>
              <div className="rounded-lg border border-[var(--line-soft)] px-2 py-2"><b className="block text-xl">{report.suspicions}</b><span className="text-[11px] text-[var(--text-dim)]">suspicions</span></div>
              <div className="rounded-lg border border-[var(--line-soft)] px-2 py-2"><b className="block text-xl">{report.filesScanned.toLocaleString()}</b><span className="text-[11px] text-[var(--text-dim)]">files · {report.durationSeconds < 90 ? `${report.durationSeconds} s` : `${Math.round(report.durationSeconds / 60)} min`}</span></div>
            </div>
            {!report.matchesTarget && (
              <p className="flex items-start gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 py-2 text-xs text-[var(--text-2)]"><TriangleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />The player's Steam account was not among the accounts found on this PC. It may have been run on another computer.</p>
            )}
            <SteamAccounts report={report} targetSteamId={data.targetSteamId} />
            {report.findings.length === 0 ? <p className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]"><Check className="size-4 text-[var(--status-green)]" aria-hidden="true" />Nothing was found.</p> : <>{group("Detections", detections)}{group("Suspicions", suspicions)}</>}
            <p className="text-[11px] leading-relaxed text-[var(--text-dim)]">A result is not a verdict. Read it, look at the player's history, and decide. Checker {report.checkerVersion}.</p>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <Button type="button" variant="outline" onClick={() => void remove()} disabled={busy}><Trash2 className="size-4" aria-hidden="true" /> Remove</Button>
          <Button type="button" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type Filter = "all" | "waiting" | "done" | "flagged"

/** Needs a person's attention: the program found something, or Steam says an account on the PC is banned. */
const flagged = (check: PlayerCheck) => Boolean(check.summary && (check.summary.detections > 0 || (check.summary.bannedAccounts ?? 0) > 0))

function minutesLeft(check: PlayerCheck) {
  return Math.max(0, Math.ceil((Date.parse(check.expiresAt) - Date.now()) / 60_000))
}

function StatusPill({ check }: { check: PlayerCheck }) {
  const tone = check.status === "completed" ? "border-[var(--status-green)]/40 text-[var(--status-green)]" : check.status === "pending" ? "border-[var(--line-strong)] text-[var(--text-2)]" : "border-[var(--line)] text-[var(--text-dim)]"
  const label = check.status === "completed" ? "Done" : check.status === "pending" ? `Waiting · ${minutesLeft(check)} min left` : "Code expired"
  return <span className={cn("inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium", tone)}>{check.status === "pending" && <Clock className="size-3" aria-hidden="true" />}{label}</span>
}

function Result({ check }: { check: PlayerCheck }) {
  const summary = check.summary
  if (!summary) return <span className="text-xs text-[var(--text-dim)]">{check.status === "pending" ? "Waiting for the player to run the checker" : "Nothing came back"}</span>
  const banned = summary.bannedAccounts ?? 0
  if (summary.detections === 0 && summary.suspicions === 0 && banned === 0) return <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]"><Check className="size-3.5 text-[var(--status-green)]" aria-hidden="true" />Nothing found</span>
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {summary.detections > 0 && <span className="inline-flex h-[22px] items-center rounded-full border border-[var(--status-red)]/50 bg-[var(--status-red)]/10 px-2.5 text-[11px] font-semibold text-[var(--status-red)]">{summary.detections} {summary.detections === 1 ? "detection" : "detections"}</span>}
      {banned > 0 && <span className="inline-flex h-[22px] items-center rounded-full border border-[var(--status-red)]/50 bg-[var(--status-red)]/10 px-2.5 text-[11px] font-semibold text-[var(--status-red)]">{banned} banned {banned === 1 ? "account" : "accounts"}</span>}
      {summary.suspicions > 0 && <span className="inline-flex h-[22px] items-center rounded-full border border-[var(--line-strong)] px-2.5 text-[11px] text-[var(--text-2)]">{summary.suspicions} {summary.suspicions === 1 ? "suspicion" : "suspicions"}</span>}
    </span>
  )
}

/** What the page does, shown when there is nothing yet (and as a short reminder above the list). */
function HowItWorks({ onAsk }: { onAsk: () => void }) {
  const steps = [
    { icon: UserSearch, title: "Ask", text: "Enter the player's Steam ID. You get a one-time code that works for an hour." },
    { icon: MessageSquareShare, title: "Send the code", text: "Give the player the code (Discord). They run the checker program, see who asked, and agree." },
    { icon: ShieldAlert, title: "Read the result", text: "Files, running programs, Steam accounts and their bans come back here. You decide." },
  ]
  return (
    <section aria-label="How checks work" className="rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-5">
      <h2 className="text-[15px] font-semibold text-[var(--text)]">Check a player's PC</h2>
      <p className="mt-1 max-w-xl text-[13px] text-[var(--text-dim)]">A result is not a verdict: it is a list of things for a person to look at. Nobody is penalised automatically.</p>
      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex flex-col gap-2 rounded-[10px] border border-[var(--line-soft)] bg-[var(--card-surface)] p-4">
            <span className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)]"><step.icon className="size-4" aria-hidden="true" /></span><span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-faint)]">Step {index + 1}</span></span>
            <span className="text-[13px] font-semibold text-[var(--text)]">{step.title}</span>
            <span className="text-xs leading-relaxed text-[var(--text-dim)]">{step.text}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onAsk} className="lx-primary-button inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold"><Plus className="size-4" aria-hidden="true" /> Ask for a check</button>
        {LINKS.checkerDownload && <a href={LINKS.checkerDownload} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] hover:border-[var(--line-strong)]"><Download className="size-4" aria-hidden="true" /> Checker program</a>}
      </div>
    </section>
  )
}

/** Staff page: ask a player to run the checker, and read what came back. Results are deleted after 30 days. */
export function ChecksPage() {
  const { data, loading, error, refetch } = useApiQuery<PlayerCheck[]>((signal) => checksService.list({ signal }), { queryKey: "checks" })
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const forbidden = (error as Partial<ApiError> | null)?.status === 403
  const list = data ?? []

  // While a player has not run it yet, look again every 15 seconds so the result appears by itself.
  const waiting = list.some((check) => check.status === "pending")
  useEffect(() => {
    if (!waiting) return
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") refetch() }, 15_000)
    return () => window.clearInterval(timer)
  }, [waiting, refetch])

  const counts = useMemo(() => ({ all: list.length, waiting: list.filter((check) => check.status === "pending").length, done: list.filter((check) => check.status === "completed").length, flagged: list.filter(flagged).length }), [list])
  const q = search.trim().toLowerCase()
  const shown = list.filter((check) => (filter === "all" || (filter === "waiting" ? check.status === "pending" : filter === "done" ? check.status === "completed" : flagged(check))) && (!q || (check.targetName ?? "").toLowerCase().includes(q) || check.targetSteamId.includes(q) || check.requestedBy.toLowerCase().includes(q)))

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageBar>
        {!forbidden && (
          <PageTabs<Filter>
            ariaLabel="Checks"
            value={filter}
            onChange={setFilter}
            options={[{ value: "all", label: `All · ${counts.all}` }, { value: "waiting", label: `Waiting · ${counts.waiting}` }, { value: "done", label: `Done · ${counts.done}` }, { value: "flagged", label: `Needs a look · ${counts.flagged}` }]}
          />
        )}
        <PageBarEnd>
          {!forbidden && (
            <>
              <label className={pageSearchClass}>
                <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search checks" placeholder="Name or Steam ID" className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] [&::-webkit-search-cancel-button]:hidden" />
              </label>
              <button type="button" onClick={() => setCreating(true)} className="lx-primary-button inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold"><Plus className="size-4" aria-hidden="true" /> Ask for a check</button>
            </>
          )}
        </PageBarEnd>
      </PageBar>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 max-md:px-4">
        {loading && !data ? (
          <div className="flex max-w-3xl flex-col gap-2">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-[68px] rounded-xl" />)}</div>
        ) : forbidden ? (
          <p className="py-24 text-center text-[13px] text-[var(--text-dim)]">Only an Admin, Manager or Owner can use this page.</p>
        ) : error || !data ? (
          <p className="flex items-center justify-center gap-3 py-24 text-[13px] text-[var(--text-dim)]">Could not load the checks.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
        ) : list.length === 0 ? (
          <div className="max-w-4xl"><HowItWorks onAsk={() => setCreating(true)} /></div>
        ) : (
          <div className="flex max-w-4xl flex-col gap-4">
            <div className="lx-stat-grid grid-cols-3">
              {[{ label: "Waiting for the player", value: counts.waiting }, { label: "Done", value: counts.done }, { label: "Need a look", value: counts.flagged }].map((stat) => (
                <div key={stat.label} className="lx-stat-cell shadow-none!">
                  <span className="lx-stat-label">{stat.label}</span>
                  <span className={cn("text-xl font-semibold leading-none", stat.label === "Need a look" && stat.value > 0 ? "text-[var(--status-red)]" : "text-[var(--text)]")}>{stat.value}</span>
                </div>
              ))}
            </div>
            {shown.length === 0 ? (
              <p className="py-8 text-[13px] text-[var(--text-dim)]">No check matches that.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {shown.map((check) => (
                  <li key={check.id}>
                    <button type="button" onClick={() => setOpen(check.id)} className={cn("group flex w-full items-center gap-3.5 rounded-xl border bg-[var(--glass-fill)] px-4 py-3 text-left transition-colors hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50", flagged(check) ? "border-[var(--status-red)]/35" : "border-[var(--glass-line)]")}>
                      <PlayerAvatar avatar={check.targetAvatar ?? undefined} name={check.targetName ?? check.targetSteamId} className="size-10 rounded-[10px] text-sm" />
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex items-center gap-2"><span className="truncate text-[13px] font-semibold text-[var(--text)]">{check.targetName ?? "Not on LEGACY-X"}</span><StatusPill check={check} /></span>
                        <span className="truncate text-[11px] text-[var(--text-dim)]">{check.targetSteamId} · asked by {check.requestedBy} · <RelativeTime value={check.createdAt} /></span>
                      </span>
                      <span className="hidden shrink-0 sm:block"><Result check={check} /></span>
                      <ChevronRight className="size-4 shrink-0 text-[var(--text-faint)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <NewCheckDialog open={creating} onOpenChange={setCreating} onCreated={() => void refetch()} />
      {open && <Detail id={open} onClose={() => setOpen(null)} onRemoved={() => void refetch()} />}
    </div>
  )
}
