import type React from "react"
/** The website's Staff page (owner pick "1", 2026-10-26): the team as trading cards, one colour per role, the Owner's card the largest. */
import { Link } from "react-router-dom"
import { MessageCircle, RotateCcw, Scale } from "lucide-react"

import { teamService, type TeamMember, type TeamRole } from "@/api/team"
import { CompetitiveRankBadge } from "@/components/competitive-rank-badge"
import { PageBar, PageBarEnd, PageTabs } from "@/components/page-tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

/** Each role's colour, the same as on the staff site (Owner violet, Manager red, Admin sky, Developer green, Designer amber). */
const ROLE_TONE: Record<TeamRole, string> = { Owner: "violet", Manager: "red", Admin: "sky", Developer: "green", Designer: "amber" }
const NUMERAL: Record<TeamRole, string> = { Owner: "I", Manager: "II", Admin: "III", Developer: "IV", Designer: "V" }
const ROLES: TeamRole[] = ["Owner", "Manager", "Admin", "Developer", "Designer"]
const PLURAL: Record<TeamRole, string> = { Owner: "Owner", Manager: "Managers", Admin: "Admins", Developer: "Developers", Designer: "Designers" }
/** What each role does, from what each one can do on the staff site. */
const DUTY: Record<TeamRole, string> = {
  Owner: "Runs LEGACY-X.",
  Manager: "Run the clans, creators, the Shop and the game servers.",
  Admin: "Watch the servers, ask for checks and hand out penalties.",
  Developer: "Build the website, the API and the game plugins.",
  Designer: "Draw the website, the cosmetics and the art.",
}

const sinceText = (iso?: string | null) => {
  const at = iso ? new Date(iso) : null
  return at && !Number.isNaN(at.getTime()) ? `Since ${at.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}` : null
}

function Face({ member, size }: { member: TeamMember; size: number }) {
  return member.avatar
    ? <img src={member.avatar} alt="" loading="lazy" className="lx-team-face" style={{ width: size, height: size }} />
    : <span aria-hidden="true" className="lx-team-face grid place-items-center text-[22px] font-bold text-[var(--text-2)]" style={{ width: size, height: size }}>{member.username.slice(0, 1).toUpperCase()}</span>
}

function TeamCard({ member }: { member: TeamMember }) {
  const owner = member.role === "Owner"
  const stats = member.stats
  const since = sinceText(member.since)
  return (
    <li className={cn("lx-team-card", owner && "lx-team-card-owner")} data-tone={ROLE_TONE[member.role]}>
      <Link to={`/profile/${member.steamId}`} className="lx-team-inner group" aria-label={`${member.username}, ${member.role}`}>
        <span aria-hidden="true" className="lx-team-numeral">{NUMERAL[member.role]}</span>
        <span aria-hidden="true" className="lx-team-role">{member.role}</span>
        <Face member={member} size={owner ? 108 : 84} />
        <span className="mt-3 flex h-5 items-center gap-1.5 text-[11px] text-[var(--text-2)]">
          {member.rank ? <><CompetitiveRankBadge rankId={member.rank.id} rankName={member.rank.name} imageKey={member.rank.imageKey} size={18} />{member.rank.name}</> : <span className="text-[var(--text-dim)]">Unranked</span>}
        </span>
        <span className="lx-team-foot">
          <span className={cn("flex items-baseline justify-center gap-1.5 font-bold text-[var(--text)]", owner ? "text-[22px]" : "text-[15px]")}>
            {member.clanTag && <span className="shrink-0 text-[11px] font-semibold text-[var(--text-dim)]">[{member.clanTag}]</span>}
            <span className="truncate">{member.username}</span>
          </span>
          <span aria-hidden="true" className="lx-team-bar" />
          {stats ? (
            <span className="grid grid-cols-3 gap-1 text-center">
              {[["Matches", stats.matches.toLocaleString()], ["Win", `${Math.round((stats.wins / stats.matches) * 100)}%`], ["K/D", (stats.kills / Math.max(1, stats.deaths)).toFixed(2)]].map(([label, value]) => (
                <span key={label} className="flex flex-col"><span className="text-[13px] font-semibold text-[var(--text)]">{value}</span><span className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-dim)]">{label}</span></span>
              ))}
            </span>
          ) : (
            <span className="block text-[11px] text-[var(--text-dim)]">No ranked matches yet</span>
          )}
          {since && <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{since}</span>}
        </span>
      </Link>
    </li>
  )
}

export function TeamPage() {
  const { data, loading, error, refetch } = useApiQuery((signal) => teamService.list({ signal }), { queryKey: "public-staff" })
  const team = data?.team ?? []
  const roles = ROLES.filter((role) => team.some((member) => member.role === role))
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageBar>
        <PageTabs options={[{ value: "team", label: "Team" }]} value="team" onChange={() => undefined} ariaLabel="Staff" />
        <PageBarEnd>{data && <span className="text-xs text-[var(--text-dim)] max-sm:hidden">{team.length} {team.length === 1 ? "person keeps" : "people keep"} LEGACY-X running</span>}</PageBarEnd>
      </PageBar>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-6 py-6 max-md:px-4">
      {loading && !data ? (
        <ul className="flex flex-wrap justify-center gap-4">{[0, 1, 2, 3, 4].map((index) => <Skeleton key={index} className={cn("rounded-2xl", index === 0 ? "h-[360px] w-[220px]" : "h-[310px] w-[180px]")} />)}</ul>
      ) : error && !data ? (
        <p className="flex items-center justify-center gap-3 py-16 text-[13px] text-[var(--text-dim)]">Could not load the team.<button type="button" onClick={() => refetch()} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
      ) : team.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-[var(--text-dim)]">No one is on the team yet.</p>
      ) : (
        <div className="mx-auto flex max-w-[1180px] flex-col gap-8">
          {/* How many of each: real counts of the list below. */}
          <div className="lx-stat-grid grid-cols-3 sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))]" style={{ "--cols": roles.length + 1 } as React.CSSProperties}>
            {[{ label: "Team", value: team.length, tone: null as string | null }, ...roles.map((role) => ({ label: PLURAL[role], value: team.filter((member) => member.role === role).length, tone: ROLE_TONE[role] }))].map((cell) => (
              <div key={cell.label} className="lx-stat-cell shadow-none!" data-tone={cell.tone ?? undefined}>
                <span className="lx-stat-label flex items-center gap-1.5">{cell.tone && <span aria-hidden="true" className="lx-team-dot size-1.5 shrink-0 rounded-full" />}{cell.label}</span>
                <span className="text-xl font-semibold leading-none text-[var(--text)]">{cell.value}</span>
              </div>
            ))}
          </div>
          <div className="grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
            {/* The Owner on the left (it stays while the rest scrolls), with where players reach the team. */}
            <aside className="flex flex-col items-center gap-4 lg:sticky lg:top-0">
              {team.filter((member) => member.role === "Owner").map((member) => <ul key={member.steamId}><TeamCard member={member} /></ul>)}
              <div className="flex w-full flex-col gap-2 max-lg:hidden">
          <div className="flex flex-col gap-2">
            <Link to="/discord" className="flex items-center gap-3 rounded-xl border border-[var(--glass-line)] p-4 transition-colors hover:border-[var(--line-strong)]">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)]"><MessageCircle className="size-4" /></span>
              <span className="min-w-0"><span className="block text-[13px] font-semibold text-[var(--text)]">Need the staff?</span><span className="block text-xs text-[var(--text-dim)]">Write to them on the LEGACY-X Discord.</span></span>
            </Link>
            <Link to="/penalties" className="flex items-center gap-3 rounded-xl border border-[var(--glass-line)] p-4 transition-colors hover:border-[var(--line-strong)]">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)]"><Scale className="size-4" /></span>
              <span className="min-w-0"><span className="block text-[13px] font-semibold text-[var(--text)]">Penalties</span><span className="block text-xs text-[var(--text-dim)]">Every ban, mute and gag the staff gave, in the open.</span></span>
            </Link>
          </div>
              </div>
            </aside>
            <div className="flex min-w-0 flex-col gap-7">
              {roles.filter((role) => role !== "Owner").map((role) => {
                const members = team.filter((member) => member.role === role)
                return (
                  <section key={role} aria-label={PLURAL[role]} className="flex flex-col gap-3" data-tone={ROLE_TONE[role]}>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[var(--line-soft)] pb-2">
                      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text)]"><span aria-hidden="true" className="lx-team-dot h-3.5 w-[3px] rounded-full" />{PLURAL[role]}<span className="text-[13px] font-normal text-[var(--text-dim)]">{members.length}</span></h2>
                      <p className="text-[13px] text-[var(--text-dim)]">{DUTY[role]}</p>
                    </div>
                    <ul className="flex flex-wrap gap-4">{members.map((member) => <TeamCard key={member.steamId} member={member} />)}</ul>
                  </section>
                )
              })}
              <div className="lg:hidden">
              <div className="flex w-full flex-col gap-2">
          <div className="flex flex-col gap-2">
            <Link to="/discord" className="flex items-center gap-3 rounded-xl border border-[var(--glass-line)] p-4 transition-colors hover:border-[var(--line-strong)]">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)]"><MessageCircle className="size-4" /></span>
              <span className="min-w-0"><span className="block text-[13px] font-semibold text-[var(--text)]">Need the staff?</span><span className="block text-xs text-[var(--text-dim)]">Write to them on the LEGACY-X Discord.</span></span>
            </Link>
            <Link to="/penalties" className="flex items-center gap-3 rounded-xl border border-[var(--glass-line)] p-4 transition-colors hover:border-[var(--line-strong)]">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)]"><Scale className="size-4" /></span>
              <span className="min-w-0"><span className="block text-[13px] font-semibold text-[var(--text)]">Penalties</span><span className="block text-xs text-[var(--text-dim)]">Every ban, mute and gag the staff gave, in the open.</span></span>
            </Link>
          </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
