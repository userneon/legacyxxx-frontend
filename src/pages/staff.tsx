import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Gavel, RotateCcw, ScanSearch, Scale, Search, Server, UserSearch, Users } from "lucide-react"

import { checksService } from "@/api/checks"
import { clansService } from "@/api/clans"
import type { ClanCard, ClanDetail } from "@/api/types"
import { ModerateClan } from "@/components/clan-manage"
import { ServersPanel } from "@/components/staff-servers"
import { penaltyAdminService, type LiftRequest, type ModerationAccess } from "@/api/moderation-access"
import type { PlayerCheck } from "@/api/checks"
import { ChecksPage } from "@/pages/checks"
import { IssuePenaltyDialog, LiftRequests } from "@/components/penalty-staff"
import { PageBar, PageTabs } from "@/components/page-tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { usePathTab } from "@/hooks/use-url-tab"

type StaffTab = "overview" | "checks" | "penalties" | "players" | "clans" | "servers"

const TABS: Array<{ value: StaffTab; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "checks", label: "Checks" },
  { value: "penalties", label: "Penalties" },
  { value: "players", label: "Players" },
  { value: "clans", label: "Clans" },
  { value: "servers", label: "Servers" },
]

const STEAM_ID = /^\d{17}$/

/** Everything staff do on the site in one place: what is waiting, checks, penalties, a player by Steam ID, and the server console. */
export function StaffPage({ initialTab = "overview" }: { initialTab?: StaffTab } = {}) {
  const { isAuthenticated } = useAuth()
  const { data: access, loading } = useApiQuery<ModerationAccess>((signal) => penaltyAdminService.getAccess({ signal }), { enabled: isAuthenticated, queryKey: `staff-access:${isAuthenticated}` })
  const [tab, setTab] = usePathTab<StaffTab>("/staff", { overview: "", checks: "checks", penalties: "penalties", players: "players", clans: "clans", servers: "servers" }, initialTab)

  if (loading || !access) {
    return <p className="px-6 py-10 text-[13px] text-[var(--text-dim)]">{loading ? "Loading…" : "This page is for staff."}</p>
  }
  if (!access.canManage) return <p className="px-6 py-10 text-[13px] text-[var(--text-dim)]">This page is for staff.</p>

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageBar>
        <PageTabs<StaffTab> ariaLabel="Staff" value={tab} onChange={setTab} options={TABS} />
      </PageBar>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
        {tab === "overview" && <Overview access={access} onGo={setTab} />}
        {tab === "checks" && <ChecksPage embedded />}
        {tab === "penalties" && <PenaltiesTab access={access} />}
        {tab === "players" && <PlayersTab access={access} />}
        {tab === "clans" && <ClansTab />}
        {tab === "servers" && <ServersPanel />}
      </div>
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

function Overview({ access, onGo }: { access: ModerationAccess; onGo: (tab: StaffTab) => void }) {
  const { data: checks } = useApiQuery<PlayerCheck[]>((signal) => checksService.list({ signal }), { queryKey: "staff-checks" })
  const { data: requests } = useApiQuery<LiftRequest[]>((signal) => penaltyAdminService.getLiftRequests({ signal }), { enabled: Boolean(access.canApprove), queryKey: `staff-lift:${access.role}` })
  const list = checks ?? []
  const waiting = list.filter((check) => check.status === "pending").length
  const toRead = list.filter((check) => check.status === "completed" && ((check.summary?.detections ?? 0) > 0 || (check.summary?.bannedAccounts ?? 0) > 0 || check.summary?.matchesTarget === false)).length
  return (
    <div className="flex flex-col gap-4 px-6 pb-8 pt-4">
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

function PlayersTab({ access }: { access: ModerationAccess }) {
  const navigate = useNavigate()
  const [steamId, setSteamId] = useState("")
  const [issuing, setIssuing] = useState(false)
  const valid = STEAM_ID.test(steamId.trim())
  return (
    <div className="flex max-w-xl flex-col gap-3 px-6 pb-8 pt-4">
      <label className="flex flex-col gap-1.5 text-[13px] text-[var(--text-2)]">
        Steam ID (17 digits)
        <Input value={steamId} onChange={(event) => setSteamId(event.target.value)} inputMode="numeric" placeholder="76561198000000000" className="font-mono" />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!valid} onClick={() => navigate(`/profile/${steamId.trim()}`)}>Open profile</Button>
        <Button type="button" variant="outline" disabled={!valid} onClick={() => setIssuing(true)}>Issue a penalty</Button>
      </div>
      <p className="text-[13px] text-[var(--text-dim)]">To find someone by name, use <Link to="/explore" className="text-[var(--text-2)] underline underline-offset-2 hover:text-[var(--text)]">Explore</Link>.</p>
      <IssuePenaltyDialog open={issuing} onOpenChange={setIssuing} access={access} onIssued={() => undefined} initialSteamId={steamId.trim()} />
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
