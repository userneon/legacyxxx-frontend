/** The website's Staff page (owner pick "1", 2026-10-26): the team as trading cards, one colour per role, the Owner's card the largest. */
import { Link } from "react-router-dom"
import { RotateCcw } from "lucide-react"

import { teamService, type TeamMember, type TeamRole } from "@/api/team"
import { PageBar, PageBarEnd, PageTabs } from "@/components/page-tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

/** Each role's colour, the same as on the staff site (Owner violet, Manager red, Admin sky, Developer green, Designer amber). */
const ROLE_TONE: Record<TeamRole, string> = { Owner: "violet", Manager: "red", Admin: "sky", Developer: "green", Designer: "amber" }
const NUMERAL: Record<TeamRole, string> = { Owner: "I", Manager: "II", Admin: "III", Developer: "IV", Designer: "V" }
const ROLES: TeamRole[] = ["Owner", "Manager", "Admin", "Developer", "Designer"]

function Face({ member, size }: { member: TeamMember; size: number }) {
  return member.avatar
    ? <img src={member.avatar} alt="" loading="lazy" className="lx-team-face" style={{ width: size, height: size }} />
    : <span aria-hidden="true" className="lx-team-face grid place-items-center text-[22px] font-bold text-[var(--text-2)]" style={{ width: size, height: size }}>{member.username.slice(0, 1).toUpperCase()}</span>
}

function TeamCard({ member }: { member: TeamMember }) {
  const owner = member.role === "Owner"
  return (
    <li className={cn("lx-team-card", owner && "lx-team-card-owner")} data-tone={ROLE_TONE[member.role]}>
      <Link to={`/profile/${member.steamId}`} className="lx-team-inner group" aria-label={`${member.username}, ${member.role}`}>
        <span aria-hidden="true" className="lx-team-numeral">{NUMERAL[member.role]}</span>
        <span aria-hidden="true" className="lx-team-role">{member.role}</span>
        <Face member={member} size={owner ? 112 : 92} />
        <span className="lx-team-foot">
          <span className={cn("block truncate font-bold text-[var(--text)]", owner ? "text-[22px]" : "text-[15px]")}>{member.username}</span>
          <span aria-hidden="true" className="lx-team-bar" />
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{member.role}</span>
        </span>
      </Link>
    </li>
  )
}

export function TeamPage() {
  const { data, loading, error, refetch } = useApiQuery((signal) => teamService.list({ signal }), { queryKey: "public-staff" })
  const team = data?.team ?? []
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageBar>
        <PageTabs options={[{ value: "team", label: "Team" }]} value="team" onChange={() => undefined} ariaLabel="Staff" />
        <PageBarEnd>{data && <span className="text-xs text-[var(--text-dim)] max-sm:hidden">{team.length} {team.length === 1 ? "person" : "people"} keep LEGACY-X running</span>}</PageBarEnd>
      </PageBar>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-6 py-6 max-md:px-4">
      {loading && !data ? (
        <ul className="flex flex-wrap justify-center gap-4">{[0, 1, 2, 3, 4].map((index) => <Skeleton key={index} className={cn("rounded-2xl", index === 0 ? "h-[300px] w-[210px]" : "h-[250px] w-[170px]")} />)}</ul>
      ) : error && !data ? (
        <p className="flex items-center justify-center gap-3 py-16 text-[13px] text-[var(--text-dim)]">Could not load the team.<button type="button" onClick={() => refetch()} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
      ) : team.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-[var(--text-dim)]">No one is on the team yet.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {ROLES.map((role) => {
            const members = team.filter((member) => member.role === role)
            if (members.length === 0) return null
            return (
              <section key={role} aria-label={role} className="flex flex-col items-center gap-3">
                {role !== "Owner" && <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-dim)] before:h-3 before:w-[3px] before:rounded-full before:bg-[var(--text-faint)]">{role}{members.length > 1 ? "s" : ""}</h2>}
                <ul className="flex flex-wrap justify-center gap-4">{members.map((member) => <TeamCard key={member.steamId} member={member} />)}</ul>
              </section>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
