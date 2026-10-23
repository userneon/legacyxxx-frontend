import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Clapperboard, Clock, Gavel, Package, RotateCcw, ScanSearch, Scale, Search, Server, UserSearch, Users } from "lucide-react"

import { PlayerCase } from "@/components/staff-case"
import { StaffCommand } from "@/components/staff-command"

import { checksService } from "@/api/checks"
import { creatorsService, type StaffCreatorApplication } from "@/api/creators"
import { moderationService } from "@/api/moderation"
import { shopGoodsService, type StaffGoodsOrder } from "@/api/shop-goods"
import { staffPanelService } from "@/api/staffpanel"
import type { PenaltyEntry, StaffPanelOverview } from "@/api/types"
import { PlayerAvatar } from "@/components/player-avatar"
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
import { cn } from "@/lib/utils"
import { usePathTab } from "@/hooks/use-url-tab"
import { ServerMapCard } from "@/components/staff-server-card"
import { CardIcon, STAFF_BODY, STAFF_CARD, STAFF_GRID, StaffEmpty, StaffSection } from "@/components/staff-ui"
import { StaffCreators } from "@/components/staff-creators"
import { StaffSettings } from "@/components/staff-settings"
import { StaffShop } from "@/components/staff-shop"
import { StaffTeam } from "@/components/staff-team"

type StaffTab = "overview" | "checks" | "penalties" | "players" | "clans" | "creators" | "shop" | "team" | "servers" | "settings"

const TABS: Array<{ value: StaffTab; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "checks", label: "Checks" },
  { value: "penalties", label: "Penalties" },
  { value: "players", label: "Players" },
  { value: "clans", label: "Clans" },
  { value: "creators", label: "Creators" },
  { value: "shop", label: "Shop" },
  { value: "team", label: "Team" },
  { value: "servers", label: "Servers" },
  { value: "settings", label: "Settings" },
]

const STEAM_ID = /^7656119\d{10}$/

/**
 * What each role sees (owner decision 2026-10-23: Admin and above get the staff site). An Admin works with checks, penalties and players;
 * a Manager adds clans, creators, the shop and the server console; the Owner adds the team and the settings. The API enforces the same
 * lines; hiding a tab only spares someone a page that would refuse them.
 */
const ADMIN_TABS: StaffTab[] = ["overview", "checks", "penalties", "players"]
const MANAGER_TABS: StaffTab[] = [...ADMIN_TABS, "clans", "creators", "shop", "servers"]
const OWNER_TABS: StaffTab[] = [...MANAGER_TABS, "team", "settings"]
const tabsFor = (role: string | null | undefined): ReadonlySet<StaffTab> => new Set(role === "OWNER" ? OWNER_TABS : role === "MANAGER" ? MANAGER_TABS : ADMIN_TABS)

/** Everything staff do on the site in one place: what is waiting, checks, penalties, a player by Steam ID, and the server console. */
export function StaffPage({ initialTab = "overview" }: { initialTab?: StaffTab } = {}) {
  const { isAuthenticated } = useAuth()
  const { data: access, loading } = useApiQuery<ModerationAccess>((signal) => penaltyAdminService.getAccess({ signal }), { enabled: isAuthenticated, queryKey: `staff-access:${isAuthenticated}` })
  const [asked, setTab] = usePathTab<StaffTab>("/staff", { overview: "", checks: "checks", penalties: "penalties", players: "players", clans: "clans", creators: "creators", shop: "shop", team: "team", servers: "servers", settings: "settings" }, initialTab)
  const allowed = tabsFor(access?.role)
  const tab: StaffTab = allowed.has(asked) ? asked : "overview"
  const [params, setParams] = useSearchParams()
  const [finding, setFinding] = useState(false)
  // What is waiting, fetched once here: the Overview lists it and the tabs show how many are waiting.
  const staffOn = Boolean(access?.canManage)
  const decider = Boolean(access?.canApprove)
  const checks = useApiQuery<PlayerCheck[]>((signal) => checksService.list({ signal }), { enabled: staffOn, queryKey: `staff-checks:${staffOn}` })
  const requests = useApiQuery<LiftRequest[]>((signal) => penaltyAdminService.getLiftRequests({ signal }), { enabled: decider, queryKey: `staff-lift:${access?.role}` })
  const applications = useApiQuery<{ applications: StaffCreatorApplication[] }>((signal) => creatorsService.applications({ signal }), { enabled: decider, queryKey: `staff-applications:${decider}` })
  const orders = useApiQuery<StaffGoodsOrder[]>((signal) => shopGoodsService.staffOrders(undefined, { signal }), { enabled: decider, queryKey: `staff-orders:${decider}` })
  const servers = useApiQuery<StaffPanelOverview>((signal) => staffPanelService.overview({ signal }), { enabled: staffOn, queryKey: `staff-servers:${staffOn}` })
  const counts: Partial<Record<StaffTab, number>> = {
    checks: (checks.data ?? []).filter((check) => check.status === "pending" || needsReading(check)).length,
    penalties: requests.data?.length ?? 0,
    creators: applications.data?.applications.length ?? 0,
    shop: orders.data?.length ?? 0,
  }
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
        <PageTabs<StaffTab> ariaLabel="Staff" value={tab} onChange={setTab} options={TABS.filter((entry) => allowed.has(entry.value)).map((entry) => ({ ...entry, count: counts[entry.value] || undefined }))} />
        <PageBarEnd>
          <button type="button" onClick={() => setFinding(true)} className="flex h-9 w-[240px] items-center gap-2 rounded-lg border border-[var(--glass-line)] px-3 text-[13px] text-[var(--text-dim)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]">
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 text-left">Find a player</span>
            <kbd className="rounded border border-[var(--line)] px-1.5 text-[10px]">Ctrl K</kbd>
          </button>
        </PageBarEnd>
      </PageBar>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
        {tab === "overview" && <Overview access={access} allowed={allowed} onGo={setTab} onCase={openCase} checks={checks.data} requests={requests.data} applications={applications.data?.applications ?? null} orders={orders.data} servers={servers.data} />}
        {tab === "checks" && <ChecksPage embedded />}
        {tab === "penalties" && <PenaltiesTab access={access} onCase={openCase} />}
        {tab === "players" && <PlayersTab access={access} caseId={params.get("case")} onFind={() => setFinding(true)} onBack={() => setParams((current) => { const next = new URLSearchParams(current); next.delete("case"); return next })} onChecks={() => setTab("checks")} />}
        {tab === "clans" && <ClansTab />}
        {tab === "creators" && <StaffCreators />}
        {tab === "shop" && <StaffShop />}
        {tab === "team" && <StaffTeam />}
        {tab === "servers" && <ServersPanel />}
        {tab === "settings" && <StaffSettings isOwner={access.role === "OWNER"} />}
      </div>
      <StaffCommand open={finding} onOpenChange={setFinding} onPick={openCase} />
    </div>
  )
}

/** A finished check a person should read: something found, a banned account, or the player's ID missing from the PC. */
function needsReading(check: PlayerCheck) {
  return check.status === "completed" && ((check.summary?.detections ?? 0) > 0 || (check.summary?.bannedAccounts ?? 0) > 0 || check.summary?.matchesTarget === false)
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

function Overview({ access, allowed, onGo, onCase, checks, requests, applications, orders, servers }: { access: ModerationAccess; allowed: ReadonlySet<StaffTab>; onGo: (tab: StaffTab) => void; onCase: (steamId: string) => void; checks: PlayerCheck[] | null; requests: LiftRequest[] | null; applications: StaffCreatorApplication[] | null; orders: StaffGoodsOrder[] | null; servers: StaffPanelOverview | null }) {
  const list = checks ?? []
  const waiting = list.filter((check) => check.status === "pending").length
  const toRead = list.filter(needsReading).length
  // What is waiting for a decision, oldest first: finished checks to read, checks still waiting for the player, unban requests, creator applications, new orders.
  type Item = { key: string; title: string; sub: string; at: number; action: string; go: () => void }
  const queue: Item[] = [
    ...list.filter(needsReading).map((check): Item => ({
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
    ...(applications ?? []).map((application): Item => ({
      key: `a:${application.id}`, title: `${application.player.username} · creator application`, sub: application.bio,
      at: Date.parse(application.createdAt), action: "Review", go: () => onGo("creators"),
    })),
    ...(orders ?? []).filter((order) => order.status === "new").map((order): Item => ({
      key: `o:${order.id}`, title: `${order.player.username} · new order`, sub: `${order.productName} × ${order.quantity} · ${order.phone}`,
      at: Date.parse(order.createdAt), action: "Open", go: () => onGo("shop"),
    })),
  ].sort((a, b) => a.at - b.at)
  const icons = { c: ScanSearch, p: Clock, l: Gavel, a: Clapperboard, o: Package } as const
  const tones = { c: "red", p: "amber", l: "violet", a: "amber", o: "sky" } as const
  return (
    <div className={STAFF_BODY}>
      <div className="lx-stat-grid grid-cols-2 sm:grid-flow-col sm:grid-cols-none sm:auto-cols-fr">
        <Cell label="Checks waiting for a player" value={checks ? waiting : "–"} onClick={() => onGo("checks")} />
        <Cell label="Results to read" value={checks ? toRead : "–"} onClick={() => onGo("checks")} />
        <Cell label="Unban requests" value={access.canApprove ? (requests ? requests.length : "–") : "–"} onClick={() => onGo("penalties")} />
        {access.canApprove && <Cell label="Creator applications" value={applications ? applications.length : "–"} onClick={() => onGo("creators")} />}
        {access.canApprove && <Cell label="Open shop orders" value={orders ? orders.length : "–"} onClick={() => onGo("shop")} />}
        <Cell label="Your role" value={access.role ?? "Staff"} />
      </div>
      <StaffSection title="Needs you" label="Needs you" count={checks ? queue.length : undefined} end={<span className="text-xs text-[var(--text-dim)]">{checks ? "oldest first" : "loading"}</span>}>
        {!checks ? (
          <div className={STAFF_GRID} aria-hidden="true">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-[132px] rounded-xl bg-[var(--glass-fill)]" />)}</div>
        ) : queue.length === 0 ? (
          <StaffEmpty>Nothing is waiting for you.</StaffEmpty>
        ) : (
          <ul className={STAFF_GRID}>
            {queue.map((item) => (
              <li key={item.key} data-tone={tones[item.key[0] as keyof typeof tones]} className={STAFF_CARD}>
                <div className="flex items-start gap-3">
                  <CardIcon icon={icons[item.key[0] as keyof typeof icons]} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-[var(--text)]" title={item.title}>{item.title}</span>
                    <span className="mt-0.5 line-clamp-2 text-xs text-[var(--text-dim)]">{item.sub}</span>
                  </span>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <span className="text-[11px] text-[var(--text-dim)]">{formatRelativeTime(new Date(item.at))}</span>
                  <Button type="button" variant="outline" size="sm" onClick={item.go}>{item.action}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </StaffSection>
      {servers && servers.servers.length > 0 && (
        <StaffSection title="Servers" count={servers.servers.length} end={<Button type="button" variant="ghost" size="sm" onClick={() => onGo("servers")}>Open the console</Button>}>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {servers.servers.map((server) => <li key={server.server_id}><ServerMapCard server={server} /></li>)}
          </ul>
        </StaffSection>
      )}
      <StaffSection title="Where to go">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {([
            { tab: "checks", tone: "violet", icon: ScanSearch, title: "Ask for a check", text: "Give a player a one-time code, read what the checker found." },
            { tab: "penalties", tone: "red", icon: Scale, title: "Penalties", text: "Issue a ban, mute or gag, and decide on unban requests." },
            { tab: "players", tone: "sky", icon: UserSearch, title: "Find a player", text: "Open a player by Steam ID, or penalise them." },
            { tab: "clans", tone: "green", icon: Users, title: "Clans", text: "Remove a logo or banner, rename a clan or delete it." },
            { tab: "servers", tone: "amber", icon: Server, title: "Servers", text: "Ban, kick, change the map, announce, restart." },
          ] as const).filter((card) => allowed.has(card.tab)).map((card) => (
            <button key={card.tab} type="button" data-tone={card.tone} onClick={() => onGo(card.tab)} className={cn(STAFF_CARD, "text-left")}>
              <CardIcon icon={card.icon} />
              <span className="text-[15px] font-semibold text-[var(--text)]">{card.title}</span>
              <span className="text-[13px] text-[var(--text-dim)]">{card.text}</span>
            </button>
          ))}
        </div>
      </StaffSection>
    </div>
  )
}

const PENALTY_TONE = { ban: "red", comm: "amber", gag: "violet" } as const
const PENALTY_LABEL = { ban: "Ban", comm: "Mute", gag: "Gag" } as const

function PenaltiesTab({ access, onCase }: { access: ModerationAccess; onCase: (steamId: string) => void }) {
  const recent = useApiQuery<PenaltyEntry[]>((signal) => moderationService.getPenalties(undefined, { signal }), { queryKey: "staff-recent-penalties" })
  const [issuing, setIssuing] = useState(false)
  const { data: requests, refetch } = useApiQuery<LiftRequest[]>((signal) => penaltyAdminService.getLiftRequests({ signal }), { enabled: Boolean(access.canApprove), queryKey: `staff-lift-tab:${access.role}` })
  return (
    <div className={STAFF_BODY}>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => setIssuing(true)}><Gavel className="size-4" aria-hidden="true" /> Issue a penalty</Button>
        <Button asChild variant="outline"><Link to="/penalties">Open the Penalties list</Link></Button>
      </div>
      {access.canApprove ? (
        <>
          <LiftRequests access={access} onDecided={() => void refetch()} />
          {(requests ?? []).length === 0 && <StaffEmpty>No unban requests are waiting.</StaffEmpty>}
        </>
      ) : (
        <StaffEmpty>Unban requests are decided by a Manager or the Owner.</StaffEmpty>
      )}
      <StaffSection title="Recent penalties" count={recent.data ? Math.min(12, recent.data.length) : undefined} end={<Button asChild variant="ghost" size="sm"><Link to="/penalties">All penalties</Link></Button>}>
        {recent.loading && !recent.data ? (
          <div className={STAFF_GRID} aria-hidden="true">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-[150px] rounded-xl bg-[var(--glass-fill)]" />)}</div>
        ) : recent.error && !recent.data ? (
          <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load the penalties.<button type="button" onClick={recent.refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" aria-hidden="true" />Retry</button></p>
        ) : (recent.data ?? []).length === 0 ? (
          <StaffEmpty>No penalties yet.</StaffEmpty>
        ) : (
          <ul className={STAFF_GRID}>
            {recent.data!.slice(0, 12).map((penalty) => (
              <li key={penalty.id} data-tone={penalty.isUnbanned ? "green" : PENALTY_TONE[penalty.type]} className={STAFF_CARD}>
                <div className="flex items-center gap-3">
                  <PlayerAvatar avatar={penalty.avatar} name={penalty.player} className="size-11 shrink-0 rounded-[10px] text-sm" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-semibold text-[var(--text)]" title={penalty.player}>{penalty.player}</span>
                    <span className="text-[11px] text-[var(--text-dim)]">by {penalty.admin} · {formatRelativeTime(new Date(penalty.date))}</span>
                  </span>
                  <span className="lx-tone-text shrink-0 rounded-full border border-[color-mix(in_oklab,var(--tone)_45%,transparent)] px-2 py-0.5 text-[11px] font-semibold">{penalty.isUnbanned ? "Lifted" : PENALTY_LABEL[penalty.type]}</span>
                </div>
                <p className="line-clamp-2 text-xs text-[var(--text-muted)]">{penalty.reason}</p>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[var(--text-dim)]">{penalty.isPermanent ? "Permanent" : penalty.term}</span>
                  {penalty.playerSteamId && <Button type="button" variant="outline" size="sm" onClick={() => onCase(penalty.playerSteamId as string)}>Open case</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </StaffSection>
      <IssuePenaltyDialog open={issuing} onOpenChange={setIssuing} access={access} onIssued={() => void refetch()} />
    </div>
  )
}

function PlayersTab({ access, caseId, onFind, onBack, onChecks }: { access: ModerationAccess; caseId: string | null; onFind: () => void; onBack: () => void; onChecks: () => void }) {
  if (caseId && STEAM_ID.test(caseId)) return <PlayerCase key={caseId} steamId={caseId} access={access} onBack={onBack} onFind={onFind} onChecks={onChecks} />
  return (
    <div className={STAFF_BODY}>
      <div data-tone="sky" className={cn(STAFF_CARD, "mx-auto mt-6 w-full max-w-md items-center gap-3 p-8 text-center")}>
        <CardIcon icon={UserSearch} className="size-12" />
        <p className="text-[15px] font-semibold text-[var(--text)]">Find a player</p>
        <p className="text-[13px] text-[var(--text-dim)]">Type a name or a Steam ID to open their case: penalties, checks and the buttons to act.</p>
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
    <div className={STAFF_BODY}>
      <label className="flex h-10 max-w-md items-center gap-2 rounded-lg border border-[var(--glass-line)] px-3 transition-[border-color] duration-200 focus-within:border-[var(--text-faint)]">
        <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search clans" placeholder="Clan name" className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] [&::-webkit-search-cancel-button]:hidden" />
      </label>
      {error ? (
        <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load the clans. <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" aria-hidden="true" />Retry</button></p>
      ) : loading && list.length === 0 ? (
        <div className={STAFF_GRID} aria-hidden="true">{[0, 1, 2].map((row) => <Skeleton key={row} className="h-[128px] rounded-xl bg-[var(--glass-fill)]" />)}</div>
      ) : list.length === 0 ? (
        <StaffEmpty>{q ? "No clan has that name." : "No clans yet."}</StaffEmpty>
      ) : (
        <ul className={STAFF_GRID}>
          {list.map((clan) => (
            <li key={clan.id} data-tone={clan.currentPlayers >= clan.maxPlayers ? "amber" : "green"} className={STAFF_CARD}>
              <div className="flex items-start gap-3">
                <CardIcon icon={Users} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[var(--text)]" title={clan.name}>{clan.name}</p>
                  <p className="font-mono text-[11px] text-[var(--text-dim)]">[{clan.tag}]</p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--raised)]"><div className="lx-tone-fill h-full rounded-full" style={{ width: `${Math.min(100, Math.round((clan.currentPlayers / Math.max(1, clan.maxPlayers)) * 100))}%` }} /></div>
                <p className="text-[11px] text-[var(--text-dim)]">{clan.currentPlayers} / {clan.maxPlayers} players</p>
              </div>
              <div className="mt-auto flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setPicked(clan.id)}>Moderate</Button>
                <Button asChild variant="ghost" size="sm"><Link to={`/clans/${clan.number ?? clan.id}`}>Open</Link></Button>
              </div>
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
