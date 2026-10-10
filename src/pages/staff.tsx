import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Gavel, ScanSearch, Scale, Server, UserSearch } from "lucide-react"

import { checksService } from "@/api/checks"
import { penaltyAdminService, type LiftRequest, type ModerationAccess } from "@/api/moderation-access"
import type { PlayerCheck } from "@/api/checks"
import { ChecksPage } from "@/pages/checks"
import { IssuePenaltyDialog, LiftRequests } from "@/components/penalty-staff"
import { PageBar, PageTabs } from "@/components/page-tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { usePathTab } from "@/hooks/use-url-tab"

type StaffTab = "overview" | "checks" | "penalties" | "players" | "servers"

const TABS: Array<{ value: StaffTab; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "checks", label: "Checks" },
  { value: "penalties", label: "Penalties" },
  { value: "players", label: "Players" },
  { value: "servers", label: "Servers" },
]

const STEAM_ID = /^\d{17}$/

/** Everything staff do on the site in one place: what is waiting, checks, penalties, a player by Steam ID, and the server console. */
export function StaffPage({ initialTab = "overview" }: { initialTab?: StaffTab } = {}) {
  const { isAuthenticated } = useAuth()
  const { data: access, loading } = useApiQuery<ModerationAccess>((signal) => penaltyAdminService.getAccess({ signal }), { enabled: isAuthenticated, queryKey: `staff-access:${isAuthenticated}` })
  const [tab, setTab] = usePathTab<StaffTab>("/staff", { overview: "", checks: "checks", penalties: "penalties", players: "players", servers: "servers" }, initialTab)

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
        {tab === "servers" && <ServersTab />}
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
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Where to go">
        {([
          { tab: "checks", icon: ScanSearch, title: "Ask for a check", text: "Give a player a one-time code, read what the checker found." },
          { tab: "penalties", icon: Scale, title: "Penalties", text: "Issue a ban, mute or gag, and decide on unban requests." },
          { tab: "players", icon: UserSearch, title: "Find a player", text: "Open a player by Steam ID, or penalise them." },
          { tab: "servers", icon: Server, title: "Servers", text: "The console for the game servers." },
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

function ServersTab() {
  return (
    <div className="flex max-w-xl flex-col gap-3 px-6 pb-8 pt-4">
      <p className="text-[13px] text-[var(--text-2)]">The server console restarts servers, changes maps, sends announcements and bans from the game. It opens in its own session and asks you to sign in with Steam again.</p>
      <div><Button asChild><Link to="/staffpanel"><Server className="size-4" aria-hidden="true" /> Open the server console</Link></Button></div>
    </div>
  )
}
