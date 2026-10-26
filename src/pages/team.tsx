/**
 * The website's Staff page (owner pick "1", 2026-10-26; laid out again the same day, "bad UX, empty space"): the Owner across the top, then the
 * rest of the team as trading cards in a grid that fills the width, filtered by role in the page bar and found by name. One colour per role.
 */
import { useState } from "react"
import { Link } from "react-router-dom"
import { MessageCircle, RotateCcw, Search, X } from "lucide-react"

import { teamService, type TeamMember, type TeamRole } from "@/api/team"
import { CompetitiveRankBadge } from "@/components/competitive-rank-badge"
import { PageBar, PageBarEnd, PageTabs, pageSearchClass } from "@/components/page-tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

/** Each role's colour, the same as on the staff site (Owner violet, Manager red, Admin sky, Developer green, Designer amber). */
const ROLE_TONE: Record<TeamRole, string> = { Owner: "violet", Manager: "red", Admin: "sky", Developer: "green", Designer: "amber" }
const NUMERAL: Record<TeamRole, string> = { Owner: "I", Manager: "II", Admin: "III", Developer: "IV", Designer: "V" }
const ROLES: TeamRole[] = ["Manager", "Admin", "Developer", "Designer"]
const PLURAL: Record<TeamRole, string> = { Owner: "Owner", Manager: "Managers", Admin: "Admins", Developer: "Developers", Designer: "Designers" }
/** What each role does, from what each one can do on the staff site. */
const DUTY: Record<TeamRole, string> = {
  Owner: "Runs LEGACY-X.",
  Manager: "Runs the clans, creators, the Shop and the game servers.",
  Admin: "Watches the servers, asks for checks and hands out penalties.",
  Developer: "Builds the website, the API and the game plugins.",
  Designer: "Draws the website, the cosmetics and the art.",
}
type Filter = "all" | TeamRole

const sinceText = (iso?: string | null) => {
  const at = iso ? new Date(iso) : null
  return at && !Number.isNaN(at.getTime()) ? at.toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : null
}

/** Matches, Win and K/D from the member's real ranked numbers; nothing before their first ranked match. */
const statCells = (member: TeamMember) => member.stats
  ? [["Matches", member.stats.matches.toLocaleString()], ["Win", `${Math.round((member.stats.wins / member.stats.matches) * 100)}%`], ["K/D", (member.stats.kills / Math.max(1, member.stats.deaths)).toFixed(2)]]
  : []

function Face({ member, size }: { member: TeamMember; size: number }) {
  return member.avatar
    ? <img src={member.avatar} alt="" loading="lazy" className="lx-team-face" style={{ width: size, height: size }} />
    : <span aria-hidden="true" className="lx-team-face grid place-items-center font-bold text-[var(--text-2)]" style={{ width: size, height: size, fontSize: size / 3.5 }}>{member.username.slice(0, 1).toUpperCase()}</span>
}

function RankLine({ member }: { member: TeamMember }) {
  return member.rank
    ? <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-2)]"><CompetitiveRankBadge rankId={member.rank.id} rankName={member.rank.name} imageKey={member.rank.imageKey} size={18} />{member.rank.name}</span>
    : <span className="text-[11px] text-[var(--text-dim)]">Unranked</span>
}

function Name({ member, className }: { member: TeamMember; className: string }) {
  return (
    <span className={cn("flex min-w-0 items-baseline gap-1.5 font-bold text-[var(--text)]", className)}>
      {member.clanTag && <span className="shrink-0 text-[11px] font-semibold text-[var(--text-dim)]">[{member.clanTag}]</span>}
      <span className="truncate">{member.username}</span>
    </span>
  )
}

/** The Owner, across the top: the same holo frame, laid out wide. */
function OwnerCard({ member }: { member: TeamMember }) {
  const since = sinceText(member.since)
  return (
    <div className="lx-team-card lx-team-hero" data-tone={ROLE_TONE.Owner}>
      <Link to={`/profile/${member.steamId}`} className="lx-team-inner flex-row! items-center gap-5 p-5 max-sm:flex-col! max-sm:text-center" aria-label={`${member.username}, Owner`}>
        <span aria-hidden="true" className="lx-team-numeral">{NUMERAL.Owner}</span>
        <Face member={member} size={104} />
        <span className="flex min-w-0 flex-1 flex-col gap-2 max-sm:items-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--tone)]">Owner</span>
          <Name member={member} className="text-[26px] leading-tight" />
          <RankLine member={member} />
          <span className="text-[13px] text-[var(--text-dim)]">{DUTY.Owner}</span>
        </span>
        <span className="lx-stat-grid shrink-0 grid-cols-4 max-md:grid-cols-2">
          {[...statCells(member), ...(since ? [["On the team", `Since ${since}`]] : [])].map(([label, value]) => (
            <span key={label} className="lx-stat-cell shadow-none! min-w-[92px]"><span className="lx-stat-label">{label}</span><span className="text-[15px] font-semibold text-[var(--text)]">{value}</span></span>
          ))}
        </span>
      </Link>
    </div>
  )
}

function TeamCard({ member }: { member: TeamMember }) {
  const since = sinceText(member.since)
  const cells = statCells(member)
  return (
    <li className="lx-team-card" data-tone={ROLE_TONE[member.role]}>
      <Link to={`/profile/${member.steamId}`} className="lx-team-inner" aria-label={`${member.username}, ${member.role}`}>
        <span aria-hidden="true" className="lx-team-numeral">{NUMERAL[member.role]}</span>
        <span aria-hidden="true" className="lx-team-role">{member.role}</span>
        <Face member={member} size={84} />
        <span className="mt-3"><RankLine member={member} /></span>
        <span className="lx-team-foot">
          <Name member={member} className="justify-center text-[15px]" />
          <span aria-hidden="true" className="lx-team-bar" />
          {cells.length ? (
            <span className="grid grid-cols-3 gap-1 text-center">
              {cells.map(([label, value]) => <span key={label} className="flex flex-col"><span className="text-[13px] font-semibold text-[var(--text)]">{value}</span><span className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-dim)]">{label}</span></span>)}
            </span>
          ) : <span className="block text-[11px] text-[var(--text-dim)]">No ranked matches yet</span>}
          {since && <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Since {since}</span>}
        </span>
      </Link>
    </li>
  )
}

export function TeamPage() {
  const { data, loading, error, refetch } = useApiQuery((signal) => teamService.list({ signal }), { queryKey: "public-staff" })
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const team = data?.team ?? []
  const owner = team.find((member) => member.role === "Owner") ?? null
  const rest = team.filter((member) => member.role !== "Owner")
  const roles = ROLES.filter((role) => rest.some((member) => member.role === role))
  const query = search.trim().toLowerCase()
  const shown = rest.filter((member) => (filter === "all" || member.role === filter) && (!query || member.username.toLowerCase().includes(query)))
  const showOwner = owner && filter === "all" && (!query || owner.username.toLowerCase().includes(query))

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageBar>
        <PageTabs<Filter> ariaLabel="Role" value={filter} onChange={setFilter} options={[{ value: "all", label: "Everyone", count: data ? team.length : undefined }, ...roles.map((role) => ({ value: role as Filter, label: PLURAL[role], count: rest.filter((member) => member.role === role).length }))]} />
        <PageBarEnd>
          <label className={cn(pageSearchClass, "max-md:hidden")}>
            <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a staff member" aria-label="Find a staff member" className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none" />
            {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="text-[var(--text-dim)] hover:text-[var(--text)]"><X className="size-3.5" /></button>}
          </label>
          <Link to="/discord" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]"><MessageCircle className="size-4" />Contact staff</Link>
        </PageBarEnd>
      </PageBar>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-6 py-6 max-md:px-4">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-6">
          {loading && !data ? (
            <>
              <Skeleton className="h-[150px] rounded-2xl" />
              <ul className="lx-team-grid">{[0, 1, 2, 3, 4, 5].map((index) => <Skeleton key={index} className="h-[300px] rounded-2xl" />)}</ul>
            </>
          ) : error && !data ? (
            <p className="flex items-center justify-center gap-3 py-16 text-[13px] text-[var(--text-dim)]">Could not load the team.<button type="button" onClick={() => refetch()} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
          ) : team.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-[var(--text-dim)]">No one is on the team yet.</p>
          ) : (
            <>
              {showOwner && <OwnerCard member={owner} />}
              {filter !== "all" && <p className="text-[13px] text-[var(--text-dim)]">{DUTY[filter]}</p>}
              {shown.length > 0
                ? <ul className="lx-team-grid">{shown.map((member) => <TeamCard key={member.steamId} member={member} />)}</ul>
                : !showOwner && <p className="py-16 text-center text-[13px] text-[var(--text-dim)]">No staff member by that name.</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
