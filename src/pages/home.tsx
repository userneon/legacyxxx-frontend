/** LEGACY-X Home: hero, live stats, play modes, the top of the ladder, reviews and Discord. */
import { ArrowRight, Crosshair, Flame, Crown, Trophy, Server, Users, Gamepad2, Play } from "lucide-react"

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
import type { PointerEvent } from "react"
import { StatTile } from "@/components/page-kit"
import { cs2MapArtwork } from "@/lib/cs2-map-art"

interface HomePageProps {
  onNavigate: (page: PageId) => void
}

type ModeKey = "5x5" | "fun" | "pro" | "tournaments"
const MODE_CARDS: { id: PageId; key: ModeKey; label: string; desc: string; icon: typeof Crosshair; map: string }[] = [
  { id: "play-5vs5", key: "5x5", label: "5x5 Matches", desc: "Competitive matches", icon: Crosshair, map: "de_mirage" },
  { id: "play-fun", key: "fun", label: "Fun Mode", desc: "Surf, aim, deathmatch and more", icon: Flame, map: "de_vertigo" },
  { id: "play-proleague", key: "pro", label: "Pro League", desc: "Ranked 5v5 for high-rank players", icon: Crown, map: "de_inferno" },
  { id: "play-tournaments", key: "tournaments", label: "Tournaments", desc: "5v5 events on Legacy-X servers", icon: Trophy, map: "de_ancient" },
]

/** Feeds the pointer position to the card's spotlight (--mx / --my). */
function trackSpotlight(event: PointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`)
  event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`)
}

const TOURNAMENT_STATE = { registration: "Registration open", upcoming: "Starting soon", live: "Live now", finished: "Finished" } as const

export function HomePage({ onNavigate }: HomePageProps) {
  const navigate = useNavigate()
  const { data: homeStats } = useApiQuery<HomeStats>((signal) => serversService.getHomeStats({ signal }))
  const { data: tournaments } = useApiQuery((signal) => tournamentsService.list({ signal }), { queryKey: "home-tournaments" })

  const statTiles = [
    { label: "Players Online", value: homeStats?.playersOnline, icon: Users, tone: "text-[var(--text)]", pulse: true },
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
      <div className="relative flex flex-col gap-4 overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] p-8 @2xl:p-10">
        <picture className="pointer-events-none absolute inset-0">
          <OptimizedImage src={homeHeroGif} width={480} height={268} priority alt="" aria-hidden="true" className="h-full w-full object-cover opacity-35" />
        </picture>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--card-surface)] via-[var(--card-surface)]/80 to-[var(--card-surface)]/20" />
        <div aria-hidden="true" className="lx-hero-glow pointer-events-none absolute -inset-10" />
        <div aria-hidden="true" className="lx-hero-grid pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--brand)]/70 to-transparent" />

        <div className="relative z-10 flex w-fit items-center gap-2 rounded-full border border-[var(--brand)]/35 bg-[var(--brand)]/10 px-3 py-1">
          {(homeStats?.playersOnline ?? 0) > 0 ? (
            <>
              <span className="lx-live-dot size-1.5 rounded-full bg-[var(--status-green)]" />
              <span className="text-xs font-medium tabular-nums text-[var(--text-2)]">Live now · {homeStats?.playersOnline} playing</span>
            </>
          ) : (
            <>
              <span className="size-1.5 rounded-full bg-[var(--brand-bright)]" />
              <span className="text-xs font-medium text-[var(--text-2)]">Mongolian CS2 community</span>
            </>
          )}
        </div>
        <h1 className="relative z-10 text-4xl font-bold tracking-[-1px] text-[var(--text)] md:text-6xl">
          LegacyX <span className="lx-brand-text">Ecosystem</span>
        </h1>
        <p className="relative z-10 max-w-xl text-[15px] leading-relaxed text-[var(--text-2)]">
          The premier CS2 / CSGO community server platform. Join matches and compete with the Mongolian CS2 community.
        </p>
        <div className="relative z-10 mt-2 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onNavigate("play-5vs5")}
            className="lx-brand-button group flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-bright)]/60"
          >
            <Play className="size-4 fill-current" />
            Play now
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate("leaders")}
            className="flex h-11 items-center gap-2 rounded-lg border border-[var(--line-strong)] bg-[var(--panel)]/70 px-5 text-sm font-medium text-[var(--text)] backdrop-blur transition-colors duration-150 hover:border-[var(--brand)]/60 hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-bright)]/60"
          >
            <Trophy className="size-4 text-[var(--brand-bright)]" />
            Leaders
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-3">
        {statTiles.map((stat) => (
          <StatTile
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            tone={stat.tone}
            pulse={stat.pulse}
            className="lx-lift"
            iconClassName="bg-[var(--brand)]/15 text-[var(--brand-bright)] ring-1 ring-inset ring-[var(--brand)]/30"
          />
        ))}
      </div>

      {/* Mode cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MODE_CARDS.map((mode, index) => {
          const status = modeStatus(mode.key)
          const art = cs2MapArtwork(mode.map)
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onNavigate(mode.id)}
              onPointerMove={trackSpotlight}
              style={{ animationDelay: `${120 + index * 80}ms` }}
              className="lx-mode-card group relative flex min-h-[176px] flex-col gap-3 overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-bright)]/60"
            >
              {art && (
                <div aria-hidden="true" className="lx-map-drift pointer-events-none absolute inset-0" style={{ animationDelay: `${index * -5}s` }}>
                  <img src={art} alt="" loading="lazy" className="h-full w-full object-cover opacity-25 grayscale-[35%] transition-[opacity,transform,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 group-hover:opacity-45 group-hover:grayscale-0" />
                </div>
              )}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--card-surface)] via-[var(--card-surface)]/70 to-transparent transition-opacity duration-700 group-hover:opacity-80" />
              <div aria-hidden="true" className="lx-spotlight pointer-events-none absolute inset-0" />
              <div className="relative flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--brand)]/15 text-[var(--brand-bright)] ring-1 ring-inset ring-[var(--brand)]/30 transition-[background-color,color,transform,box-shadow] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-[var(--brand)] group-hover:text-[var(--brand-on)] group-hover:shadow-[0_0_20px_var(--brand)]">
                  <mode.icon className="size-5" />
                </div>
                <ArrowRight className="size-4 -translate-x-2 text-[var(--brand-bright)] opacity-0 transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0 group-hover:opacity-100" />
              </div>
              <div className="relative mt-auto transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5">
                <div className="font-semibold text-[var(--text)]">{mode.label}</div>
                <div className="mt-1 text-xs text-[var(--text-muted)] transition-colors duration-500 group-hover:text-[var(--text-2)]">{mode.desc}</div>
              </div>
              <div className={cn("relative flex h-4 items-center gap-1.5 transition-opacity duration-150", status ? "opacity-100" : "opacity-0")}>
                {status?.live && <span className="lx-live-dot size-1.5 rounded-full bg-[var(--status-green)]" />}
                <span className="text-xs tabular-nums text-[var(--text-dim)]">{status?.text ?? " "}</span>
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
