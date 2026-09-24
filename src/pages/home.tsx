/** LEGACY-X Home: hero, live stats, play modes, the top of the ladder, reviews and Discord. */
import { Crosshair, Flame, Crown, Trophy, Server, Users, Gamepad2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { serversService } from "@/api"
import { tournamentsService } from "@/api/tournaments"
import type { HomeStats, PageId } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { OptimizedImage } from "@/components/optimized-image"
import homeHeroGif from "@/assets/skinchanger/hero.gif"
import { HomeReviews } from "@/components/home-reviews"
import { DiscordStrip } from "@/components/discord-strip"
import { TopPlayers } from "@/components/home-top-players"
import { useNavigate } from "react-router-dom"
import { StatTile } from "@/components/page-kit"

interface HomePageProps {
  onNavigate: (page: PageId) => void
}

type ModeKey = "5x5" | "fun" | "pro" | "tournaments"
const MODE_CARDS: { id: PageId; key: ModeKey; label: string; desc: string; icon: typeof Crosshair }[] = [
  { id: "play-5vs5", key: "5x5", label: "5x5 Matches", desc: "Competitive matches", icon: Crosshair },
  { id: "play-fun", key: "fun", label: "Fun Mode", desc: "Surf, aim, deathmatch and more", icon: Flame },
  { id: "play-proleague", key: "pro", label: "Pro League", desc: "Ranked 5v5 for high-rank players", icon: Crown },
  { id: "play-tournaments", key: "tournaments", label: "Tournaments", desc: "5v5 events on Legacy-X servers", icon: Trophy },
]

const TOURNAMENT_STATE = { registration: "Registration open", upcoming: "Starting soon", live: "Live now", finished: "Finished" } as const

export function HomePage({ onNavigate }: HomePageProps) {
  const navigate = useNavigate()
  const { data: homeStats } = useApiQuery<HomeStats>((signal) => serversService.getHomeStats({ signal }))
  const { data: tournaments } = useApiQuery((signal) => tournamentsService.list({ signal }), { queryKey: "home-tournaments" })

  const statTiles = [
    { label: "Players Online", value: homeStats?.playersOnline, icon: Users, tone: "text-[var(--text)]" },
    { label: "Live Servers", value: homeStats?.liveServers, icon: Server, tone: "text-[var(--text)]" },
    { label: "Matches Today", value: homeStats?.matchesToday, icon: Gamepad2, tone: "text-[var(--text)]" },
  ]

  /** Real status line per mode card: players on that mode's servers, or the tournament state. */
  const modeStatus = (key: ModeKey): { text: string; live: boolean } | null => {
    if (key === "tournaments") {
      const current = tournaments?.current
      if (!tournaments) return null
      return current ? { text: TOURNAMENT_STATE[current.phase], live: current.phase === "live" } : { text: "No tournament scheduled", live: false }
    }
    const players = homeStats?.modes?.[key]
    if (players === undefined) return null
    return players > 0 ? { text: `${players} playing now`, live: true } : { text: "No one playing right now", live: false }
  }

  return (
    <div className="@container flex flex-col gap-5 p-4 @2xl:p-6">
      {/* Hero */}
      <div className="relative flex flex-col gap-4 overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] p-8">
        <picture className="pointer-events-none absolute inset-0">
          <OptimizedImage src={homeHeroGif} width={480} height={268} priority alt="" aria-hidden="true" className="h-full w-full object-cover opacity-25" />
        </picture>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--card-surface)] via-[var(--card-surface)]/75 to-[var(--card-surface)]/25" />
        {(homeStats?.playersOnline ?? 0) > 0 && (
          <div className="relative z-10 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[var(--status-green)]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Live now</span>
          </div>
        )}
        <h1 className="relative z-10 text-3xl font-semibold tracking-[-0.5px] text-[var(--text)] md:text-5xl">LegacyX Ecosystem</h1>
        <p className="relative z-10 max-w-xl text-[var(--text-muted)]">
          The premier CS2 / CSGO community server platform. Join matches and compete with the Mongolian CS2 community.
        </p>
        <div className="relative z-10 mt-2 flex flex-wrap gap-3">
          {MODE_CARDS.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onNavigate(mode.id)}
              className="group flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)]/80 px-4 py-3 transition-colors duration-150 hover:border-[var(--line-strong)] hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"
            >
              <mode.icon className="size-5 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text)]" />
              <span className="text-sm font-medium text-[var(--text)]">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-3">
        {statTiles.map((stat) => <StatTile key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} tone={stat.tone} />)}
      </div>

      {/* Mode cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MODE_CARDS.map((mode) => {
          const status = modeStatus(mode.key)
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onNavigate(mode.id)}
              className="group flex flex-col gap-3 rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] p-5 text-left transition-colors duration-150 hover:border-[var(--line-strong)] hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--raised)] text-[var(--text)]">
                <mode.icon className="size-5" />
              </div>
              <div>
                <div className="font-semibold text-[var(--text)]">{mode.label}</div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">{mode.desc}</div>
              </div>
              <div className={cn("mt-auto flex h-4 items-center gap-1.5 transition-opacity duration-150", status ? "opacity-100" : "opacity-0")}>
                {status?.live && <span className="size-1.5 rounded-full bg-[var(--status-green)]" />}
                <span className="text-xs tabular-nums text-[var(--text-dim)]">{status?.text ?? " "}</span>
              </div>
            </button>
          )
        })}
      </div>

      <TopPlayers onOpenProfile={(steamId) => navigate(`/profile/${encodeURIComponent(steamId)}`)} onViewAll={() => onNavigate("leaders")} />

      <HomeReviews onWriteReview={() => onNavigate("feedback")} />
      <DiscordStrip />
    </div>
  )
}
