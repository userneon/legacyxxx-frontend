/** LEGACY-X Home: hero, live stats, play modes, the top of the ladder, reviews and Discord. */
import { ArrowRight, Crosshair, Flame, Crown, Trophy } from "lucide-react"

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
import { AnimatedNumber } from "@/components/animated-number"
import { Skeleton } from "@/components/ui/skeleton"
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
  const { data: homeStats, loading: statsLoading } = useApiQuery<HomeStats>((signal) => serversService.getHomeStats({ signal }))
  const { data: tournaments } = useApiQuery((signal) => tournamentsService.list({ signal }), { queryKey: "home-tournaments" })

  const heroStats = [
    { label: "Players Online", value: homeStats?.playersOnline, flagship: true },
    { label: "Live Servers", value: homeStats?.liveServers, flagship: false },
    { label: "Matches Today", value: homeStats?.matchesToday, flagship: false },
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
        <dl className="relative z-10 mt-3 grid w-full max-w-2xl grid-cols-3">
          {heroStats.map((stat, index) => (
            <div
              key={stat.label}
              className={cn("flex min-w-0 flex-col-reverse justify-end gap-2 pr-3 @2xl:pr-8", index > 0 && "border-l border-[var(--line-strong)] pl-3 @2xl:pl-8")}
            >
              <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase leading-tight tracking-wide text-[var(--text-muted)] @2xl:text-xs">
                {stat.flagship && Boolean(stat.value) && <span className="lx-live-dot size-1.5 shrink-0 rounded-full bg-[var(--status-green)]" />}
                {stat.label}
              </dt>
              <dd className={cn("text-2xl font-bold leading-none tabular-nums @2xl:text-4xl", stat.flagship ? "text-[var(--brand-bright)]" : "text-[var(--text)]")}>
                {statsLoading && stat.value === undefined ? <Skeleton className="h-6 w-12 @2xl:h-9 @2xl:w-14" /> : <AnimatedNumber value={stat.value} />}
              </dd>
            </div>
          ))}
        </dl>
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
              className="lx-fx-card group relative flex min-h-[176px] flex-col gap-3 overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-bright)]/60"
            >
              {art && (
                <div aria-hidden="true" className="lx-map-drift pointer-events-none absolute inset-0" style={{ animationDelay: `${index * -5}s` }}>
                  <img src={art} alt="" loading="lazy" className="lx-map-img h-full w-full object-cover opacity-30 transition-[opacity,scale] duration-[1000ms] ease-[cubic-bezier(0.37,0,0.18,1)] group-hover:scale-[1.08] group-hover:opacity-50 group-hover:duration-700 group-hover:ease-[cubic-bezier(0.22,1,0.36,1)]" />
                </div>
              )}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--card-surface)] via-[var(--card-surface)]/70 to-transparent transition-opacity duration-[900ms] ease-[cubic-bezier(0.37,0,0.18,1)] group-hover:opacity-80 group-hover:duration-500" />
              <div aria-hidden="true" className="lx-spotlight pointer-events-none absolute inset-0" />
              <div className="relative flex items-start justify-between">
                <div className="lx-layer flex size-10 items-center justify-center rounded-lg bg-[var(--brand)]/15 text-[var(--brand-bright)] ring-1 ring-inset ring-[var(--brand)]/30 transition-[background-color,color,scale,rotate,box-shadow] duration-[800ms] ease-[cubic-bezier(0.37,0,0.18,1)] group-hover:duration-500 group-hover:ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-3 group-hover:scale-[1.06] group-hover:bg-[var(--brand)] group-hover:text-[var(--brand-on)] group-hover:shadow-[0_0_20px_var(--brand)]">
                  <mode.icon className="size-5" />
                </div>
                <ArrowRight className="size-4 -translate-x-2 text-[var(--brand-bright)] opacity-0 transition-[opacity,translate] duration-[800ms] ease-[cubic-bezier(0.37,0,0.18,1)] group-hover:duration-500 group-hover:ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0 group-hover:opacity-100" />
              </div>
              <div className="relative mt-auto transition-[translate] duration-[800ms] ease-[cubic-bezier(0.37,0,0.18,1)] group-hover:duration-500 group-hover:ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5">
                <div className="font-semibold text-[var(--text)]">{mode.label}</div>
                <div className="mt-1 text-xs text-[var(--text-muted)] transition-colors duration-[800ms] ease-[cubic-bezier(0.37,0,0.18,1)] group-hover:duration-500 group-hover:text-[var(--text-2)]">{mode.desc}</div>
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
