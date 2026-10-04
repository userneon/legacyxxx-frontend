import { Quote, Star } from "lucide-react"
import { Link } from "react-router-dom"

import { feedbackService, serversService } from "@/api"
import type { FeedbackEntry, HomeStats } from "@/api/types"
import type { ProfileOverview } from "@/api/profile-overview"
import { AnimatedNumber } from "@/components/animated-number"
import { PlayerAvatar } from "@/components/player-avatar"
import { RelativeTime } from "@/components/relative-time"
import { useApiQuery } from "@/hooks/use-api-query"
import { formatDate } from "@/lib/preferences"
import { cn } from "@/lib/utils"

const card = "overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]"

function Heading({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
        <span aria-hidden="true" className="h-3.5 w-[3px] rounded-full bg-[var(--text-faint)]" />
        {children}
      </h2>
      {note}
    </div>
  )
}

/** Whole days between a date and today; never negative. */
function daysSince(value: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000))
}

/** The community right now (the same numbers as the home page) next to how long the Owner has been here. */
function CommunityNow({ memberSince }: { memberSince: string | null }) {
  const { data: stats } = useApiQuery<HomeStats>((signal) => serversService.getHomeStats({ signal }), { queryKey: "owner-community" })
  if (!stats && !memberSince) return null
  const cells: Array<{ label: string; value: React.ReactNode; flagship?: boolean }> = []
  if (stats) {
    cells.push({ label: "Players online", value: <AnimatedNumber value={stats.playersOnline} />, flagship: true })
    cells.push({ label: "Live servers", value: <AnimatedNumber value={stats.liveServers} /> })
    cells.push({ label: "Matches today", value: <AnimatedNumber value={stats.matchesToday} /> })
  }
  if (memberSince) cells.push({ label: "On Legacy-X since", value: <span className="text-[20px]">{formatDate(memberSince)}</span> })
  return (
    <section aria-label="Legacy-X right now" className="lx-stat-grid grid-cols-2 sm:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.label} className="lx-stat-cell">
          <span className="lx-stat-label">{cell.label}</span>
          <span className={cn("text-[26px] font-bold leading-none", cell.flagship ? "text-[var(--brand-bright)]" : "text-[var(--text)]")}>{cell.value}</span>
          {cell.label === "On Legacy-X since" && memberSince && <span className="text-xs text-[var(--text-dim)]">{daysSince(memberSince).toLocaleString()} days</span>}
        </div>
      ))}
    </section>
  )
}

function OwnerMessage({ message }: { message: string }) {
  const text = message.trim().slice(0, 400)
  if (!text) return null
  return (
    <section aria-label="Message from the Owner" className={cn(card, "relative px-8 py-9 text-center")}>
      <Quote aria-hidden="true" className="absolute left-5 top-5 size-7 text-[var(--line-strong)]" />
      <p className="mx-auto max-w-xl whitespace-pre-line text-balance text-[22px] font-semibold leading-snug text-[var(--text)] max-sm:text-lg">{text}</p>
    </section>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5" role="img" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => <Star key={star} className={cn("size-3.5", Math.round(value) >= star ? "fill-[var(--star)] text-[var(--star)]" : "fill-[var(--line)] text-[var(--line)]")} />)}
    </span>
  )
}

/** The best recent reviews from the Reviews page: real players, real text. */
function PlayerReviews() {
  const { data } = useApiQuery<FeedbackEntry[]>((signal) => feedbackService.getFeedback({ signal }), { queryKey: "owner-reviews" })
  const picks = [...(data ?? [])].filter((entry) => entry.rating >= 4 && entry.message.trim()).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
  if (picks.length === 0) return null
  return (
    <section aria-label="What players say" className={card}>
      <Heading note={<Link to="/reviews" className="text-xs text-[var(--text-dim)] transition-colors hover:text-[var(--text)]">All reviews</Link>}>What players say</Heading>
      <ul className="grid gap-2.5 p-4 sm:grid-cols-3">
        {picks.map((entry) => (
          <li key={entry.id} className="flex flex-col gap-3 rounded-[10px] border border-[var(--line-soft)] bg-[var(--panel)]/60 p-3.5">
            <Stars value={entry.rating} />
            <p className="line-clamp-4 text-[13px] leading-5 text-[var(--text-2)]">{entry.message}</p>
            <span className="mt-auto flex items-center gap-2 text-xs text-[var(--text-dim)]">
              <PlayerAvatar avatar={entry.avatar} name={entry.name} className="size-6 rounded-md text-[9px]" />
              <span className="truncate font-medium text-[var(--text-muted)]">{entry.name}</span>
              <RelativeTime value={entry.date} className="ml-auto shrink-0" />
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Team({ team }: { team: NonNullable<ProfileOverview["team"]> }) {
  if (team.length === 0) return null
  return (
    <section aria-label="The team" className={card}>
      <Heading>The team</Heading>
      <ul className="flex flex-col gap-1 p-3">
        {team.map((member) => (
          <li key={member.steamId}>
            <Link to={`/profile/${encodeURIComponent(member.steamId)}`} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
              <PlayerAvatar avatar={member.avatar} name={member.username} className="size-9 rounded-[10px] text-xs" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-medium text-[var(--text)]">{member.username}</span>
                <span className="text-xs text-[var(--text-dim)]">{member.role}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Updates({ updates }: { updates: NonNullable<ProfileOverview["updates"]> }) {
  if (updates.length === 0) return null
  return (
    <section aria-label="Latest updates" className={card}>
      <Heading>Latest updates</Heading>
      <ol className="flex flex-col gap-0 p-4">
        {updates.slice(0, 4).map((update, index) => (
          <li key={update.id} className="relative flex gap-3 pb-4 last:pb-0">
            <span aria-hidden="true" className="relative mt-1.5 flex shrink-0 flex-col items-center">
              <span className={cn("size-2 rounded-full", index === 0 ? "bg-[var(--text)]" : "bg-[var(--text-faint)]")} />
              {index < Math.min(updates.length, 4) - 1 && <span className="mt-1 w-px flex-1 bg-[var(--line)]" />}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[13px] font-medium text-[var(--text)]">{update.title}</span>
              <RelativeTime value={update.at} className="text-xs text-[var(--text-dim)]" />
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * Everything on the Owner's profile besides Respect and links: the community right now, a message from the Owner, the best
 * reviews, the team and the latest updates. Every card appears only when it has real data to show.
 */
export function OwnerSections({ overview }: { overview: ProfileOverview }) {
  const team = overview.team ?? []
  const updates = overview.updates ?? []
  return (
    <>
      <CommunityNow memberSince={overview.user.memberSince} />
      {overview.message && <OwnerMessage message={overview.message} />}
      <PlayerReviews />
      {(team.length > 0 || updates.length > 0) && (
        <div className={cn("grid items-start gap-4", team.length > 0 && updates.length > 0 && "md:grid-cols-2")}>
          <Team team={team} />
          <Updates updates={updates} />
        </div>
      )}
    </>
  )
}
