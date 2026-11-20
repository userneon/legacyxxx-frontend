import { Link } from "react-router-dom"

import { clansService } from "@/api/clans"
import type { ClanDetail, ClanMember } from "@/api/types"
import { EmptyState } from "@/components/illustrations"
import { useApiQuery } from "@/hooks/use-api-query"
import { clanTagProps } from "@/lib/cosmetics"
import { cn } from "@/lib/utils"

/**
 * The Profile's Clan tab (owner request 2026-11-20): shown only when the player is in a clan, and it holds only what is about this player in that clan: their role, when they joined,
 * their place by EXP among the members, their share of the clan's EXP and their own ranked numbers. Everything comes from the clan's member list; a figure the API does not send is not drawn.
 */
const card = "lx-pcard rounded-[24px] border border-[var(--glass-line)] bg-[var(--glass-fill)]"
const ROLES: Record<string, string> = { leader: "Leader", "co-leader": "Co-leader", captain: "Captain", member: "Member" }
const long = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl border border-[var(--line-soft)] bg-black/20 px-4 py-3.5">
      <span className="truncate text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-dim)]">{label}</span>
      <span className="text-[26px] font-bold leading-none tabular-nums text-[var(--text)]">{value}</span>
      {hint ? <span className="truncate text-[12px] text-[var(--text-dim)]">{hint}</span> : null}
    </div>
  )
}

export function ProfileClanTab({ clanId, clanNumber, steamId, userId }: { clanId: string; clanNumber?: number | null; steamId?: string; userId: string }) {
  const clan = useApiQuery<ClanDetail>((signal) => clansService.getClan(clanId, { signal }), { queryKey: `profile-clan:${clanId}` })
  const inline = clan.data?.members
  // The clan's own answer carries the members; the member list is asked for only when it does not.
  const members = useApiQuery<ClanMember[]>((signal) => clansService.getClanMembers(clanId, { signal }), { queryKey: `profile-clan-members:${clanId}`, enabled: Boolean(clan.data) && !(inline && inline.length > 0) })
  if ((clan.loading || members.loading) && !clan.data) return <div aria-hidden="true" className={cn(card, "h-[260px] animate-pulse")} />
  const list = inline && inline.length > 0 ? inline : members.data ?? []
  const me = list.find((member) => (steamId && member.steamId === steamId) || member.id === userId)
  if (!clan.data || !me) return <div className={cn(card, "p-6")}><EmptyState small>This player's clan numbers could not be loaded.</EmptyState></div>

  const byExp = [...list].sort((a, b) => (b.stats?.currentExp ?? 0) - (a.stats?.currentExp ?? 0))
  const place = byExp.findIndex((member) => member === me) + 1
  const totalExp = list.reduce((sum, member) => sum + (member.stats?.currentExp ?? 0), 0)
  const exp = me.stats?.currentExp
  const share = exp !== undefined && totalExp > 0 ? Math.round((exp / totalExp) * 100) : null
  const role = ROLES[me.role] ?? me.role
  const path = `/clans/${clanNumber ?? clanId}`

  return (
    <div className="flex flex-col gap-4">
      <section className={cn(card, "flex flex-wrap items-center gap-4 p-5")}>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-dim)]">Clan</span>
          <h2 className="flex min-w-0 items-center gap-2 text-[22px] font-bold text-[var(--text)]">
            <span {...clanTagProps(clan.data.look)} className="shrink-0">[{clan.data.tag}]</span>
            <span className="truncate">{clan.data.name}</span>
          </h2>
          <p className="text-[13px] text-[var(--text-muted)]">
            {role}{me.joinedAt ? <> · joined {long(me.joinedAt)} ({daysSince(me.joinedAt)} days ago)</> : null}
          </p>
        </div>
        <Link to={path} className="inline-flex h-9 items-center rounded-lg border border-[var(--line)] px-4 text-[13px] font-semibold text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]">Open the clan</Link>
      </section>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Role" value={role} />
        {place > 0 && exp !== undefined && <Stat label="Place by EXP" value={`#${place}`} hint={`of ${list.length} members`} />}
        {exp !== undefined && <Stat label="EXP" value={exp.toLocaleString()} hint={share !== null ? `${share}% of the clan's EXP` : undefined} />}
        {me.stats?.matches !== undefined && <Stat label="Ranked matches" value={String(me.stats.matches)} />}
        {me.stats?.winRate !== null && me.stats?.winRate !== undefined && <Stat label="Win rate" value={`${Math.round(me.stats.winRate)}%`} />}
        {me.stats?.kd !== null && me.stats?.kd !== undefined && <Stat label="K/D" value={me.stats.kd.toFixed(2)} />}
      </section>
    </div>
  )
}
