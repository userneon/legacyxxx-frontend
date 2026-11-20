import { Link } from "react-router-dom"

import { clanArtSrc, clansService } from "@/api/clans"
import type { ClanDetail, ClanMember } from "@/api/types"
import { EmptyState } from "@/components/illustrations"
import { useApiQuery } from "@/hooks/use-api-query"
import { ClanMark } from "@/components/clan-mark"
import { backdropStyle, clanTagProps, pageBackground } from "@/lib/cosmetics"
import { cn } from "@/lib/utils"

/**
 * The Profile's Clan tab (owner request 2026-11-20): shown only when the player is in a clan, and it holds only what is about this player in that clan: their role, when they joined,
 * their place by EXP among the members, their share of the clan's EXP and their own ranked numbers. Everything comes from the clan's member list; a figure the API does not send is not drawn.
 */
const card = "lx-pcard rounded-[24px] border border-[var(--glass-line)] bg-[var(--glass-fill)]"
const ROLES: Record<string, string> = { leader: "Leader", "co-leader": "Co-leader", captain: "Captain", member: "Member" }
const long = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))

const HEX = /^#[0-9a-f]{6}$/i

/** A number of the player in the clan, tinted with the clan's own colour (the --clan variable of the tab). */
function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="relative flex min-w-0 flex-col gap-1 overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--clan)_28%,var(--line-soft))] bg-[color-mix(in_oklab,var(--clan)_7%,rgb(0_0_0/0.2))] px-4 py-3.5 before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-[var(--clan)] before:opacity-70">
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

  const look = clan.data.look
  // The clan's colour: its tag colour, else the start of its backdrop or page colours, else a calm blue.
  const accent = (look?.tagColor && HEX.test(look.tagColor) ? look.tagColor : look?.backdrop?.from && HEX.test(look.backdrop.from) ? look.backdrop.from : look?.page?.from && HEX.test(look.page.from) ? look.page.from : "#6f8cff")
  const banner = clanArtSrc(clan.data.thumbnail)
  const wash = backdropStyle(look?.backdrop) ?? pageBackground(look?.page)

  return (
    <div style={{ "--clan": accent } as React.CSSProperties} className="flex flex-col gap-4">
      <section className={cn(card, "relative overflow-hidden")}>
        {wash && <span aria-hidden="true" className="absolute inset-0 opacity-40" style={{ background: wash }} />}
        <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(70%_120%_at_0%_0%,color-mix(in_oklab,var(--clan)_26%,transparent),transparent_70%)]" />
        {banner && (
          <div className="relative h-32 overflow-hidden md:h-40">
            <img src={banner} alt="" aria-hidden="true" loading="lazy" decoding="async" className="size-full object-cover" />
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--glass-fill)] via-black/20 to-transparent" />
          </div>
        )}
        <div className={cn("relative flex flex-wrap items-end gap-x-5 gap-y-3 p-5", banner && "-mt-10")}>
          <ClanMark logo={clan.data.logo} tag={clan.data.tag} className="size-[84px] rounded-2xl border-[color-mix(in_oklab,var(--clan)_55%,var(--line))] text-[16px] shadow-[0_10px_30px_rgb(0_0_0/0.45)]" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--clan)]">Clan</span>
            <h2 className="flex min-w-0 items-center gap-2 text-[24px] font-bold leading-tight text-[var(--text)]">
              <span {...clanTagProps(look)} className="shrink-0">[{clan.data.tag}]</span>
              <span className="truncate">{clan.data.name}</span>
            </h2>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--text-muted)]">
              <span className="inline-flex h-6 items-center rounded-full border border-[color-mix(in_oklab,var(--clan)_45%,transparent)] bg-[color-mix(in_oklab,var(--clan)_14%,transparent)] px-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text)]">{role}</span>
              {me.joinedAt ? <span>joined {long(me.joinedAt)} ({daysSince(me.joinedAt)} days ago)</span> : null}
            </p>
          </div>
          <Link to={path} className="inline-flex h-9 items-center rounded-lg border border-[color-mix(in_oklab,var(--clan)_45%,var(--line))] bg-black/25 px-4 text-[13px] font-semibold text-[var(--text)] transition-colors hover:bg-black/40">Open the clan</Link>
        </div>
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
