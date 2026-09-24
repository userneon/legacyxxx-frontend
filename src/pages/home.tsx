/**
 * Home keeps its content (hero, live stats, play modes, player reviews, Discord), restyled to the neutral
 * tokens inside the shell panel. Every number comes from the API; zeros from a quiet server are shown as zeros,
 * missing data as a dash.
 */
import { Link } from "react-router-dom"
import { ArrowRight, Crosshair, Crown, Flame, Gamepad2, Lock, Server, Trophy, Users } from "lucide-react"

import { feedbackService, serversService, type FeedbackEntry, type HomeStats } from "@/api"
import { formatInt } from "@/lib/format"
import { PAGE_ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"
import homeHero from "@/assets/skinchanger/hero.gif"
import { Card, Page, SectionTitle } from "@/components/page"
import { PlayerAvatar } from "@/components/player-avatar"
import { Stars } from "@/components/stars"
import { DiscordStrip } from "@/components/discord-strip"
import { ErrorState, Skeleton } from "@/components/states"
import { useApiQuery } from "@/hooks/use-api-query"
import { useLiveServers } from "@/hooks/use-live-servers"
import { useMyRank } from "@/hooks/use-my-rank"

const MODES = [
  { to: PAGE_ROUTES["play-5vs5"], label: "5x5 Matches", desc: "Competitive 5v5 that counts toward your rank.", icon: Crosshair, mode: "5v5" as const },
  { to: PAGE_ROUTES["play-fun"], label: "Fun Mode", desc: "Retakes, deathmatch, surf and more. No rank on the line.", icon: Flame, mode: "fun" as const },
  { to: PAGE_ROUTES["play-proleague"], label: "Pro League", desc: "Even matches for Vanguard I and above.", icon: Crown, mode: "pro" as const },
  { to: PAGE_ROUTES["play-tournaments"], label: "Tournaments", desc: "Scheduled tournaments, solo or with a team.", icon: Trophy, mode: null },
]

function StatTile({ icon: Icon, label, value, live }: { icon: typeof Users; label: string; value: number | null | undefined; live?: boolean }) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <span className="flex items-center justify-between text-text-muted">
        <Icon className="size-4" aria-hidden />
        {live && Boolean(value) && <span className="size-1.5 rounded-full bg-live" aria-hidden />}
      </span>
      {value === undefined ? <Skeleton className="h-6 w-16 bg-line" /> : <span className="text-2xl font-semibold tabular-nums text-text animate-fade-in">{formatInt(value)}</span>}
      <span className="text-xs text-text-dim">{label}</span>
    </Card>
  )
}

function ReviewsStrip() {
  const { data, loading, error, refetch } = useApiQuery<FeedbackEntry[]>((signal) => feedbackService.getFeedback({ signal }))
  const reviews = [...(data ?? [])].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  const average = reviews.length ? reviews.reduce((sum, entry) => sum + entry.rating, 0) / reviews.length : 0

  return (
    <section aria-label="What players say" className="flex flex-col gap-3">
      <SectionTitle
        action={
          <Link to={PAGE_ROUTES.feedback} className="group inline-flex items-center gap-1.5 text-[13px] text-text-muted transition-colors duration-150 hover:text-text">
            {reviews.length > 0 ? "All reviews" : "Write the first review"}
            <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        }
      >
        <span className="inline-flex items-center gap-3">
          What players say
          {reviews.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-normal text-text-muted tabular-nums">
              <Stars value={average} size={12} />
              {average.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
            </span>
          )}
        </span>
      </SectionTitle>
      {loading && !data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Card key={index} className="flex h-36 flex-col gap-3 p-4">
              <Skeleton className="h-2.5 w-4/5" />
              <Skeleton className="h-2.5 w-3/5" />
              <span className="mt-auto flex items-center gap-2">
                <Skeleton className="size-7 rounded-lg" />
                <Skeleton className="h-2.5 w-20" />
              </span>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <ErrorState onRetry={refetch} />
        </Card>
      ) : reviews.length === 0 ? (
        <Card className="px-4 py-8 text-center text-[13px] text-text-dim">No reviews yet.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {reviews.slice(0, 4).map((entry) => (
            <Card key={entry.id} className="flex min-w-0 flex-col justify-between gap-4 p-4 animate-fade-in">
              <p className="m-0 line-clamp-3 text-[13px] leading-5 text-text-2">{entry.message}</p>
              <span className="flex items-center gap-2.5">
                <PlayerAvatar avatar={entry.avatar} name={entry.name} size={28} />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-text-muted" title={entry.name}>{entry.name}</span>
                <Stars value={entry.rating} size={12} />
              </span>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

export function HomePage() {
  const { servers, onlineByMode } = useLiveServers()
  const { profile } = useMyRank()
  const { data: stats, loading: statsLoading } = useApiQuery<HomeStats>((signal) => serversService.getHomeStats({ signal }), { pollMs: 60_000, keepPreviousData: true })
  /** undefined while the first load runs (skeleton), null when it failed (dash). */
  const stat = (value: number | undefined) => (value !== undefined ? value : statsLoading ? undefined : null)
  const liveServers = servers.filter((server) => server.status !== "offline").length

  return (
    <Page>
      <section className="relative isolate flex min-h-[220px] flex-col justify-end gap-3 overflow-hidden rounded-xl border border-line-soft bg-card p-6 sm:p-8">
        <img src={homeHero} alt="" aria-hidden width={480} height={268} className="pointer-events-none absolute inset-0 -z-10 size-full object-cover opacity-25 grayscale" />
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-card via-card/85 to-card/30" />
        <span className="flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-text-muted uppercase">
          <span className={cn("size-1.5 rounded-full", liveServers > 0 ? "bg-live" : "bg-text-faint")} aria-hidden />
          Live now
        </span>
        <h1 className="m-0 text-3xl font-bold tracking-[-0.5px] text-text sm:text-[40px]">LegacyX Ecosystem</h1>
        <p className="m-0 max-w-xl text-sm text-text-muted">The premier CS2 community server platform. Join matches and compete with the Mongolian CS2 community.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MODES.map((mode) => (
            <Link
              key={mode.to}
              to={mode.to}
              className="press inline-flex h-10 items-center gap-2 rounded-[10px] border border-line bg-panel/60 px-4 text-[13px] font-medium text-text transition-colors duration-150 hover:border-line-strong hover:bg-raised"
            >
              <mode.icon className="size-4 text-text-muted" aria-hidden />
              {mode.label}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile icon={Users} label="Players online" value={stat(stats?.playersOnline)} live />
        <StatTile icon={Server} label="Live servers" value={stat(stats?.liveServers)} live />
        <StatTile icon={Gamepad2} label="Matches today" value={stat(stats?.matchesToday)} />
      </div>

      <section aria-label="Play" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {MODES.map((mode) => {
          const online = mode.mode ? onlineByMode[mode.mode] : 0
          const locked = mode.mode === "pro" && !profile?.pro_league_unlocked
          return (
            <Link
              key={mode.to}
              to={mode.to}
              className="group flex flex-col gap-4 rounded-xl border border-line-soft bg-card p-5 transition-colors duration-150 hover:border-line-strong hover:bg-raised"
            >
              <span className="flex size-10 items-center justify-center rounded-[10px] border border-line bg-raised text-text">
                <mode.icon className="size-[18px]" aria-hidden />
              </span>
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-[15px] font-semibold text-text">
                  {mode.label}
                  {locked && <Lock className="size-3.5 text-text-dim" aria-label="Locked" />}
                </span>
                <span className="text-[13px] text-text-muted">{mode.desc}</span>
              </span>
              {online > 0 && (
                <span className="mt-auto flex items-center gap-1.5 text-xs text-text-muted tabular-nums">
                  <span className="size-1.5 rounded-full bg-live" aria-hidden />
                  {online} playing
                </span>
              )}
            </Link>
          )
        })}
      </section>

      <ReviewsStrip />
      <DiscordStrip />
    </Page>
  )
}
