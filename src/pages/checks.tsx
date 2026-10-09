import { useEffect, useMemo, useState } from "react"
import { ChevronRight, Download, RotateCcw, Search, ShieldAlert, Trash2, TriangleAlert, Plus } from "lucide-react"
import { toast } from "sonner"

import { checksService, type CheckFinding, type CheckReport, type PlayerCheck, type PlayerCheckDetail } from "@/api/checks"
import type { ApiError } from "@/api/types"
import { HudTile, LogLines, PromptLine, RiskMeter, ThreatBadge, threatOf } from "@/components/checks/console"
import { NewCheckDialog } from "@/components/new-check-dialog"
import { PageBar, PageBarEnd, PageTabs, pageSearchClass } from "@/components/page-tabs"
import { PlayerAvatar } from "@/components/player-avatar"
import { RelativeTime } from "@/components/relative-time"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { LINKS } from "@/lib/links"
import { cn } from "@/lib/utils"

type Filter = "all" | "waiting" | "done" | "flagged"

const KIND: Record<CheckFinding["kind"], string> = { file: "file", process: "process", trace: "trace", steam: "steam", tamper: "tamper" }

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
    <section className="flex flex-col gap-2" aria-label="Steam accounts">
      <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[1.6px] text-[var(--text-faint)]">// steam accounts on this pc <span className="text-[var(--chk-accent)]">{accounts.length}</span></h3>
      <ul className="flex flex-col gap-1.5">
        {ids.map((steamId) => {
          const account = accounts.find((entry) => entry.steamId === steamId)
          const ban = bans.get(steamId)
          const banned = Boolean(ban && (ban.vacBanned || ban.gameBans > 0))
          const asked = steamId === targetSteamId
          return (
            <li key={steamId} className="chk-panel px-3 py-2.5">
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
              <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--text-dim)]">{steamId}{account?.accountName ? ` · login ${account.accountName}` : ""}</p>
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


/** Asks first, then removes the check and its result for good. Returns true when it is gone. */
async function removeCheck(id: string, waiting: boolean): Promise<boolean> {
  if (!window.confirm(waiting ? "Cancel this check? The code stops working." : "Remove this check and its result for good?")) return false
  try {
    await checksService.remove(id)
    toast.success(waiting ? "Check cancelled" : "Check removed")
    return true
  } catch (caught) {
    toast.error("Could not remove it", { description: (caught as Partial<ApiError>)?.status === 403 ? "An Admin can only remove their own checks." : "Try again in a moment." })
    return false
  }
}

function minutesLeft(check: PlayerCheck) {
  return Math.max(0, Math.ceil((Date.parse(check.expiresAt) - Date.now()) / 60_000))
}

/** The case file: everything one check found, as a console log and a few cards. */
function Detail({ id, onClose, onRemoved }: { id: string; onClose: () => void; onRemoved: () => void }) {
  const { data, loading, error, refetch } = useApiQuery<PlayerCheckDetail>((signal) => checksService.get(id, { signal }), { queryKey: `check:${id}` })
  const [busy, setBusy] = useState(false)
  const remove = async () => {
    setBusy(true)
    const gone = await removeCheck(id, data?.status === "pending")
    setBusy(false)
    if (gone) { onRemoved(); onClose() }
  }
  const report = data?.report ?? null
  const bannedAccounts = (report?.steamBans ?? []).filter((ban) => ban.vacBanned || ban.gameBans > 0).length
  const lines = (report?.findings ?? []).map((finding) => ({ level: finding.confidence, name: finding.name, kind: KIND[finding.kind], detail: [finding.path, finding.note].filter(Boolean).join(" · ") || undefined }))
  const sorted = [...lines.filter((line) => line.level === "detection"), ...lines.filter((line) => line.level === "suspicion")]
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="chk-theme max-h-[88vh] overflow-y-auto rounded-2xl border-[var(--chk-line)] sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3.5 pr-6">
            {data && <PlayerAvatar avatar={data.targetAvatar ?? undefined} name={data.targetName ?? data.targetSteamId} className="size-12 rounded-xl text-base" />}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <DialogTitle className="truncate font-mono">{data ? data.targetName ?? "Not on LEGACY-X" : "Case"}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                {data ? <><ThreatBadge threat={threatOf(data)} /><span>case {data.id.slice(0, 8)} // asked by {data.requestedBy}</span></> : "loading…"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {loading && !data ? <Skeleton className="h-40 rounded-xl" /> : error || !data ? (
          <p className="flex items-center gap-3 font-mono text-[13px] text-[var(--text-dim)]">could not load this case.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />retry</button></p>
        ) : !report ? (
          <PromptLine className="text-[13px] text-[var(--text-dim)]" text={data.status === "pending" ? "waiting for the player to run the checker…" : "no result: the code ended before it was used."} />
        ) : (
          <div className="flex flex-col gap-4">
            {(report.detections > 0 || bannedAccounts > 0) && (
              <p className="flex items-start gap-2 rounded-lg border border-[var(--status-red)]/40 bg-[var(--status-red)]/10 px-3 py-2 font-mono text-[12px] text-[var(--text-2)]"><ShieldAlert className="mt-px size-4 shrink-0 text-[var(--status-red)]" aria-hidden="true" />needs a person to look: {[report.detections > 0 ? `${report.detections} ${report.detections === 1 ? "detection" : "detections"}` : "", bannedAccounts > 0 ? `${bannedAccounts} banned steam ${bannedAccounts === 1 ? "account" : "accounts"}` : ""].filter(Boolean).join(" + ")}</p>
            )}
            <div className="chk-panel flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-3"><span className="font-mono text-[10px] font-semibold uppercase tracking-[1.6px] text-[var(--text-faint)]">// risk</span><RiskMeter detections={report.detections} suspicions={report.suspicions} banned={bannedAccounts} /></div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div><b className={cn("block text-2xl", report.detections > 0 && "text-[var(--status-red)]")}>{report.detections}</b><span className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-dim)]">detections</span></div>
                <div><b className="block text-2xl">{report.suspicions}</b><span className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-dim)]">suspicions</span></div>
                <div><b className="block text-2xl">{report.filesScanned.toLocaleString()}</b><span className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-dim)]">files · {report.durationSeconds < 90 ? `${report.durationSeconds} s` : `${Math.round(report.durationSeconds / 60)} min`}</span></div>
              </div>
            </div>
            {!report.matchesTarget && (
              <p className="flex items-start gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 py-2 text-xs text-[var(--text-2)]"><TriangleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />The player's Steam account was not among the accounts found on this PC. It may have been run on another computer.</p>
            )}
            <SteamAccounts report={report} targetSteamId={data.targetSteamId} />
            <section className="flex flex-col gap-2" aria-label="Findings">
              <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[1.6px] text-[var(--text-faint)]">// findings <span className="text-[var(--chk-accent)]">{sorted.length}</span></h3>
              {sorted.length === 0 ? <LogLines lines={[{ level: "info", name: "nothing was found" }]} /> : <LogLines lines={sorted} />}
            </section>
            <p className="font-mono text-[11px] leading-relaxed text-[var(--text-dim)]">// a result is not a verdict. read it, look at the player's history, decide. checker {report.checkerVersion}.</p>
          </div>
        )}
        <div className="sticky -bottom-6 -mx-6 -mb-6 flex justify-between gap-2 border-t border-[var(--line-soft)] bg-background px-6 py-4">
          <Button type="button" variant="outline" onClick={() => void remove()} disabled={busy}><Trash2 className="size-4" aria-hidden="true" /> {data?.status === "pending" ? "Cancel check" : "Remove"}</Button>
          <Button type="button" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** The three steps, shown when there are no checks yet. */
function Protocol({ onAsk }: { onAsk: () => void }) {
  const steps = [
    { n: "01", title: "ask", text: "Enter the player's Steam ID. You get a one-time code that works for an hour." },
    { n: "02", title: "send the code", text: "Give the player the code (Discord). They run the checker, see who asked, and agree." },
    { n: "03", title: "read the result", text: "Files, running programs, Steam accounts and their bans come back here. You decide." },
  ]
  return (
    <section aria-label="How checks work" className="chk-panel flex flex-col gap-5 p-6">
      <div className="flex flex-col gap-1.5">
        <PromptLine className="text-[18px] font-semibold text-[var(--text)]" text="no checks yet" />
        <p className="max-w-xl font-mono text-[12px] leading-relaxed text-[var(--text-dim)]">// a result is not a verdict. nobody is penalised automatically.</p>
      </div>
      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map((step) => (
          <li key={step.n} className="chk-log flex flex-col gap-2 p-4">
            <span className="font-mono text-[22px] font-semibold text-[var(--chk-accent)]">{step.n}</span>
            <span className="font-mono text-[13px] font-semibold text-[var(--text)]">{step.title}</span>
            <span className="text-xs leading-relaxed text-[var(--text-dim)]">{step.text}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
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

  const counts = useMemo(() => ({ all: list.length, waiting: list.filter((check) => check.status === "pending").length, done: list.filter((check) => check.status === "completed").length, flagged: list.filter((check) => threatOf(check) === "flagged").length }), [list])
  const q = search.trim().toLowerCase()
  const shown = list.filter((check) => (filter === "all" || (filter === "waiting" ? check.status === "pending" : filter === "done" ? check.status === "completed" : threatOf(check) === "flagged")) && (!q || (check.targetName ?? "").toLowerCase().includes(q) || check.targetSteamId.includes(q) || check.requestedBy.toLowerCase().includes(q)))

  return (
    <div className="chk-theme flex h-full min-h-0 flex-col">
      <PageBar>
        {!forbidden && (
          <PageTabs<Filter>
            ariaLabel="Checks"
            value={filter}
            onChange={setFilter}
            options={[{ value: "all", label: `All · ${counts.all}` }, { value: "waiting", label: `Waiting · ${counts.waiting}` }, { value: "done", label: `Done · ${counts.done}` }, { value: "flagged", label: `Flagged · ${counts.flagged}` }]}
          />
        )}
        <PageBarEnd>
          {!forbidden && (
            <>
              <label className={pageSearchClass}>
                <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search checks" placeholder="Name or Steam ID" className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] [&::-webkit-search-cancel-button]:hidden" />
              </label>
              <button type="button" onClick={() => setCreating(true)} className="lx-primary-button inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold"><Plus className="size-4" aria-hidden="true" /> Ask for a check</button>
            </>
          )}
        </PageBarEnd>
      </PageBar>
      <div className="chk-stage min-h-0 flex-1 overflow-y-auto px-6 py-5 max-md:px-4">
        {loading && !data ? (
          <div className="flex max-w-4xl flex-col gap-2">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-[72px] rounded-xl" />)}</div>
        ) : forbidden ? (
          <p className="py-24 text-center font-mono text-[13px] text-[var(--text-dim)]">&gt; access denied: only an admin, manager or owner can use this page.</p>
        ) : error || !data ? (
          <p className="flex items-center justify-center gap-3 py-24 font-mono text-[13px] text-[var(--text-dim)]">could not load the checks.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />retry</button></p>
        ) : list.length === 0 ? (
          <div className="max-w-4xl"><Protocol onAsk={() => setCreating(true)} /></div>
        ) : (
          <div className="flex max-w-4xl flex-col gap-5">
            <div className="flex flex-col gap-1">
              <PromptLine className="text-[20px] font-semibold text-[var(--text)]" text="checks // console" />
              <p className="font-mono text-[12px] text-[var(--text-dim)]">// {counts.waiting} waiting · {counts.flagged} flagged · latest {counts.all}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <HudTile label="waiting" value={counts.waiting} />
              <HudTile label="done" value={counts.done} tone="ok" />
              <HudTile label="flagged" value={counts.flagged} tone={counts.flagged > 0 ? "danger" : undefined} />
            </div>
            {shown.length === 0 ? (
              <p className="py-6 font-mono text-[13px] text-[var(--text-dim)]">&gt; no check matches that.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {shown.map((check) => {
                  const threat = threatOf(check)
                  const summary = check.summary
                  return (
                    <li key={check.id} className="group/row relative">
                      <button type="button" data-level={threat === "flagged" ? "flagged" : threat === "clear" ? "clear" : "review"} onClick={() => setOpen(check.id)} className="chk-row chk-panel group flex w-full items-center gap-4 py-3 pl-5 pr-[4.5rem] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50">
                        <PlayerAvatar avatar={check.targetAvatar ?? undefined} name={check.targetName ?? check.targetSteamId} className="size-10 rounded-[10px] text-sm" />
                        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <span className="flex items-center gap-2"><span className="truncate font-mono text-[13px] font-semibold text-[var(--text)]">{check.targetName ?? "not on legacy-x"}</span><ThreatBadge threat={threat} /></span>
                          <span className="truncate font-mono text-[11px] text-[var(--text-dim)]">{check.targetSteamId} // {check.requestedBy} // <RelativeTime value={check.createdAt} />{check.status === "pending" ? ` // ${minutesLeft(check)} min left` : ""}</span>
                        </span>
                        <span className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                          <RiskMeter detections={summary?.detections ?? 0} suspicions={summary?.suspicions ?? 0} banned={summary?.bannedAccounts ?? 0} className={cn(!summary && "opacity-30")} />
                          <span className="font-mono text-[10px] tracking-[1px] text-[var(--text-dim)]">{summary ? `${summary.detections} DET · ${summary.suspicions} SUS${(summary.bannedAccounts ?? 0) > 0 ? ` · ${summary.bannedAccounts} BAN` : ""}` : check.status === "pending" ? "AWAITING PLAYER" : "NO RESULT"}</span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-[var(--text-faint)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={check.status === "pending" ? "Cancel this check" : "Remove this check"}
                        title={check.status === "pending" ? "Cancel" : "Remove"}
                        onClick={async () => { if (await removeCheck(check.id, check.status === "pending")) void refetch() }}
                        className="absolute right-11 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg border border-transparent text-[var(--text-faint)] opacity-0 transition-[opacity,color,border-color] hover:border-[var(--line)] hover:text-[var(--status-red)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50 group-hover/row:opacity-100 max-sm:opacity-100"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </li>
                  )
                })}
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
