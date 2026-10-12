import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Gavel, RotateCcw, ScanSearch, Scale, Search, Server, UserSearch, Users } from "lucide-react"

import { PlayerCase } from "@/components/staff-case"
import { StaffCommand } from "@/components/staff-command"

import { checksService } from "@/api/checks"
import { clansService } from "@/api/clans"
import type { ClanCard, ClanDetail } from "@/api/types"
import { ModerateClan } from "@/components/clan-manage"
import { ServersPanel } from "@/components/staff-servers"
import { penaltyAdminService, type LiftRequest, type ModerationAccess } from "@/api/moderation-access"
import type { PlayerCheck } from "@/api/checks"
import { ChecksPage } from "@/pages/checks"
import { IssuePenaltyDialog, LiftRequests } from "@/components/penalty-staff"
import { PageBar, PageBarEnd, PageTabs } from "@/components/page-tabs"
import { Button } from "@/components/ui/button"
import { formatRelativeTime } from "@/components/relative-time"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { usePathTab } from "@/hooks/use-url-tab"
import { StaffCreators } from "@/components/staff-creators"
import { StaffTeam } from "@/components/staff-team"

type StaffTab = "overview" | "checks" | "penalties" | "players" | "clans" | "creators" | "team" | "servers"

const TABS: Array<{ value: StaffTab; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "checks", label: "Checks" },
  { value: "penalties", label: "Penalties" },
  { value: "players", label: "Players" },
  { value: "clans", label: "Clans" },
  { value: "creators", label: "Creators" },
  { value: "team", label: "Team" },
  { value: "servers", label: "Servers" },
]

const STEAM_ID = /^7656119\d{10}$/

/** Everything staff do on the site in one place: what is waiting, checks, penalties, a player by Steam ID, and the server console. */
export function StaffPage({ initialTab = "overview" }: { initialTab?: StaffTab } = {}) {
  const { isAuthenticated } = useAuth()
  const { data: access, loading } = useApiQuery<ModerationAccess>((signal) => penaltyAdminService.getAccess({ signal }), { enabled: isAuthenticated, queryKey: `staff-access:${isAuthenticated}` })
  const [tab, setTab] = usePathTab<StaffTab>("/staff", { overview: "", checks: "checks", penalties: "penalties", players: "players", clans: "clans", creators: "creators", team: "team", servers: "servers" }, initialTab)
  const [params, setParams] = useSearchParams()
  const [finding, setFinding] = useState(false)
  const openCase = (steamId: string) => {
    setTab("players")
    setParams((current) => { const next = new URLSearchParams(current); next.set("case", steamId); return next }, { replace: false })
  }

  // Ctrl K (or Cmd K) finds a player from anywhere on the page.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setFinding((open) => !open) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  if (loading || !access) {
    return <p className="px-6 py-10 text-[13px] text-[var(--text-dim)]">{loading ? "Loading…" : "This page is for staff."}</p>
  }
  if (!access.canManage) return <p className="px-6 py-10 text-[13px] text-[var(--text-dim)]">This page is for staff.</p>

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageBar>
        <PageTabs<StaffTab> ariaLabel="Staff" value={tab} onChange={setTab} options={TABS} />
        <PageBarEnd>
          <button type="button" onClick={() => setFinding(true)} className="flex h-9 w-[240px] items-center gap-2 rounded-lg border border-[var(--glass-line)] px-3 text-[13px] text-[var(--text-dim)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]">
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 text-left">Find a player</span>
            <kbd className="rounded border border-[var(--line)] px-1.5 text-[10px]">Ctrl K</kbd>
          </button>
        </PageBarEnd>
      </PageBar>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
        {tab === "overview" && <Overview access={access} onGo={setTab} onCase={openCase} />}
        {tab === "checks" && <ChecksPage embedded />}
        {tab === "penalties" && <PenaltiesTab access={access} />}
        {tab === "players" && <PlayersTab access={access} caseId={params.get("case")} onFind={() => setFinding(true)} onBack={() => setParams((current) => { const next = new URLSearchParams(current); next.delete("case"); return next })} onChecks={() => setTab("checks")} />}
        {tab === "clans" && <ClansTab />}
        {tab === "creators" && <StaffCreators />}
        {tab === "team" && <StaffTeam />}
        {tab === "servers" && <ServersPanel />}
      </div>
      <StaffCommand open={finding} onOpenChange={setFinding} onPick={openCase} />
    </div>
  )
}

function Cell({ label, value, onClick }: { label: string; value: string | number; onClick?: () => void }) {
  const body = (
    <>
      <span className="lx-stat-label">{label}</span>
      <span className="text-xl font-semibold leading-none text-[var(--text)]">{value}</span>
    </>
  )
  return onClick ? <button type="button" onClick={onClick} className="lx-stat-cell text-left shadow-none! transition-colors hover:bg-[var(--raised)]">{body}</button> : <div className="lx-stat-cell shadow-none!">{body}</div>
}

function Overview({ access, onGo, onCase }: { access: ModerationAccess; onGo: (tab: StaffTab) => void; onCase: (steamId: string) => void }) {
  const { data: checks } = useApiQuery<PlayerCheck[]>((signal) => checksService.list({ signal }), { queryKey: "staff-checks" })
  const { data: requests } = useApiQuery<LiftRequest[]>((signal) => penaltyAdminService.getLiftRequests({ signal }), { enabled: Boolean(access.canApprove), queryKey: `staff-lift:${access.role}` })
  const list = checks ?? []
  const waiting = list.filter((check) => check.status === "pending").length
  const toRead = list.filter((check) => check.status === "completed" && ((check.summary?.detections ?? 0) > 0 || (check.summary?.bannedAccounts ?? 0) > 0 || check.summary?.matchesTarget === false)).length
  // What is waiting for a decision, oldest first: finished checks to read, checks still waiting for the player, unban requests.
  type Item = { key: string; title: string; sub: string; at: number; action: string; go: () => void }
  const queue: Item[] = [
    ...list.filter((check) => check.status === "completed" && ((check.summary?.detections ?? 0) > 0 || (check.summary?.bannedAccounts ?? 0) > 0 || check.summary?.matchesTarget === false)).map((check): Item => ({
      key: `c:${check.id}`, title: `${check.targetName ?? check.targetSteamId} · check finished`,
      sub: [`${check.summary?.detections ?? 0} detections`, (check.summary?.bannedAccounts ?? 0) > 0 ? `${check.summary?.bannedAccounts} banned account(s)` : null].filter(Boolean).join(" · "),
      at: Date.parse(check.completedAt ?? check.createdAt), action: "Open", go: () => onCase(check.targetSteamId),
    })),
    ...list.filter((check) => check.status === "pending").map((check): Item => ({
      key: `p:${check.id}`, title: `${check.targetName ?? check.targetSteamId} · check waiting`, sub: "Waiting for the player to run it",
      at: Date.parse(check.createdAt), action: "Open", go: () => onCase(check.targetSteamId),
    })),
    ...(requests ?? []).map((request): Item => ({
      key: `l:${request.id}`, title: `${request.player} · unban request`, sub: `by ${request.requestedBy}${request.reason ? ` · "${request.reason}"` : ""}`,
      at: Date.parse(request.at), action: "Review", go: () => onGo("penalties"),
    })),
  ].sort((a, b) => a.at - b.at)
  return (
    <div className="flex flex-col gap-4 px-6 pb-8 pt-4">
      <section className="flex flex-col rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]" aria-label="Needs you">
        <header className="flex items-baseline gap-2 border-b border-[var(--line-soft)] px-4 py-3">
          <span aria-hidden="true" className="h-3 w-[3px] shrink-0 self-center rounded-full bg-[var(--text-faint)]" />
          <h2 className="text-[13px] font-semibold text-[var(--text)]">Needs you</h2>
          <span className="text-[12px] text-[var(--text-dim)]">{checks ? "oldest first" : "loading"}</span>
        </header>
        {!checks ? (
          <p className="px-4 py-4 text-[13px] text-[var(--text-dim)]">Loading…</p>
        ) : queue.length === 0 ? (
          <p className="px-4 py-4 text-[13px] text-[var(--text-dim)]">Nothing is waiting for you.</p>
        ) : (
          <ul>
            {queue.map((item) => (
              <li key={item.key} className="flex items-center gap-3 border-b border-[var(--line-soft)] px-4 py-3 last:border-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-[var(--text)]">{item.title}</span>
                  <span className="block truncate text-[12px] text-[var(--text-dim)]">{item.sub} · {formatRelativeTime(new Date(item.at))}</span>
                </span>
                <Button type="button" variant="outline" size="sm" onClick={item.go}>{item.action}</Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="lx-stat-grid grid-cols-2 sm:grid-flow-col sm:grid-cols-none sm:auto-cols-fr">
        <Cell label="Checks waiting for a player" value={checks ? waiting : "–"} onClick={() => onGo("checks")} />
        <Cell label="Results to read" value={checks ? toRead : "–"} onClick={() => onGo("checks")} />
        <Cell label="Unban requests" value={access.canApprove ? (requests ? requests.length : "–") : "–"} onClick={() => onGo("penalties")} />
        <Cell label="Your role" value={access.role ?? "Staff"} />
      </div>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Where to go">
        {([
          { tab: "checks", icon: ScanSearch, title: "Ask for a check", text: "Give a player a one-time code, read what the checker found." },
          { tab: "penalties", icon: Scale, title: "Penalties", text: "Issue a ban, mute or gag, and decide on unban requests." },
          { tab: "players", icon: UserSearch, title: "Find a player", text: "Open a player by Steam ID, or penalise them." },
          { tab: "clans", icon: Users, title: "Clans", text: "Remove a logo or banner, rename a clan or delete it." },
          { tab: "servers", icon: Server, title: "Servers", text: "Ban, kick, change the map, announce, restart." },
        ] as const).map((card) => (
          <button key={card.tab} type="button" onClick={() => onGo(card.tab)} className="flex flex-col gap-2 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-4 text-left transition-colors hover:border-[var(--line-strong)]">
            <card.icon className="size-[18px] text-[var(--text-2)]" aria-hidden="true" />
            <span className="text-[15px] font-semibold text-[var(--text)]">{card.title}</span>
            <span className="text-[13px] text-[var(--text-dim)]">{card.text}</span>
          </button>
        ))}
      </section>
    </div>
  )
}

function PenaltiesTab({ access }: { access: ModerationAccess }) {
  const [issuing, setIssuing] = useState(false)
  const { data: requests, refetch } = useApiQuery<LiftRequest[]>((signal) => penaltyAdminService.getLiftRequests({ signal }), { enabled: Boolean(access.canApprove), queryKey: `staff-lift-tab:${access.role}` })
  return (
    <div className="flex flex-col gap-4 px-6 pb-8 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => setIssuing(true)}><Gavel className="size-4" aria-hidden="true" /> Issue a penalty</Button>
        <Button asChild variant="outline"><Link to="/penalties">Open the Penalties list</Link></Button>
      </div>
      {access.canApprove ? (
        <>
          <LiftRequests access={access} onDecided={() => void refetch()} />
          {(requests ?? []).length === 0 && <p className="text-[13px] text-[var(--text-dim)]">No unban requests are waiting.</p>}
        </>
      ) : (
        <p className="text-[13px] text-[var(--text-dim)]">Unban requests are decided by a Manager or the Owner.</p>
      )}
      <IssuePenaltyDialog open={issuing} onOpenChange={setIssuing} access={access} onIssued={() => void refetch()} />
    </div>
  )
}

function PlayersTab({ access, caseId, onFind, onBack, onChecks }: { access: ModerationAccess; caseId: string | null; onFind: () => void; onBack: () => void; onChecks: () => void }) {
  if (caseId && STEAM_ID.test(caseId)) return <PlayerCase key={caseId} steamId={caseId} access={access} onBack={onBack} onFind={onFind} onChecks={onChecks} />
  return (
    <div className="flex max-w-xl flex-col gap-3 px-6 pb-8 pt-6">
      <p className="text-[15px] font-semibold text-[var(--text)]">Find a player</p>
      <p className="text-[13px] text-[var(--text-dim)]">Type a name or a Steam ID. Their penalties, what the checker found and the buttons to act are on one screen.</p>
      <div>
        <Button type="button" onClick={onFind}><Search className="size-4" aria-hidden="true" />Find a player<kbd className="ml-1 rounded border border-[var(--line)] px-1 text-[10px]">Ctrl K</kbd></Button>
      </div>
    </div>
  )
}

function ClansTab() {
  const [search, setSearch] = useState("")
  const [picked, setPicked] = useState<string | null>(null)
  const q = search.trim()
  const { data: clans, loading, error, refetch } = useApiQuery<ClanCard[]>((signal) => clansService.getClans({ q: q || undefined, sort: "name", limit: 30 }, { signal }), { queryKey: `staff-clans:${q}`, keepPreviousData: true })
  const { data: detail, refetch: refetchDetail } = useApiQuery<ClanDetail>((signal) => clansService.getClan(picked ?? "", { signal }), { enabled: Boolean(picked), queryKey: `staff-clan:${picked ?? ""}` })
  const list = clans ?? []
  return (
    <div className="flex max-w-3xl flex-col gap-3 px-6 pb-8 pt-4">
      <label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--glass-line)] px-3 transition-[border-color] duration-200 focus-within:border-[var(--text-faint)]">
        <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search clans" placeholder="Clan name" className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] [&::-webkit-search-cancel-button]:hidden" />
      </label>
      {error ? (
        <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load the clans. <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" aria-hidden="true" />Retry</button></p>
      ) : loading && list.length === 0 ? (
        <div className="flex flex-col gap-2" aria-hidden="true">{[0, 1, 2, 3].map((row) => <Skeleton key={row} className="h-[52px] rounded-xl bg-[var(--glass-fill)]" />)}</div>
      ) : list.length === 0 ? (
        <p className="text-[13px] text-[var(--text-dim)]">{q ? "No clan has that name." : "No clans yet."}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((clan) => (
            <li key={clan.id} className="flex items-center gap-3 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[var(--text)]">{clan.name} <span className="font-mono text-[11px] font-normal text-[var(--text-dim)]">[{clan.tag}]</span></p>
                <p className="text-[11px] text-[var(--text-dim)]">{clan.currentPlayers} / {clan.maxPlayers} players</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setPicked(clan.id)}>Moderate</Button>
              <Button asChild variant="ghost" size="sm"><Link to={`/clans/${clan.number ?? clan.id}`}>Open</Link></Button>
            </li>
          ))}
        </ul>
      )}
      {picked && detail && (
        <ModerateClan key={detail.id} clan={detail} defaultOpen hideTrigger onClose={() => setPicked(null)} onChanged={() => { void refetchDetail(); void refetch() }} onDeleted={() => { setPicked(null); void refetch() }} />
      )}
    </div>
  )
}
