/** LEGACY-X Home: hero, live stats, play modes, the top of the ladder, reviews and Discord. */
import { useState } from "react"
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
import { AnimatedNumber } from "@/components/animated-number"
import { Skeleton } from "@/components/ui/skeleton"
import { cs2MapArtwork } from "@/lib/cs2-map-art"

interface HomePageProps {
  onNavigate: (page: PageId) => void
}

type ModeKey = "5x5" | "fun" | "pro" | "tournaments"
const MODE_CARDS: { id: PageId; key: ModeKey; label: string; desc: string; map: string }[] = [
  { id: "play-5vs5", key: "5x5", label: "5x5 Matches", desc: "Competitive matches", map: "de_mirage" },
  { id: "play-fun", key: "fun", label: "Fun Mode", desc: "Surf, aim, deathmatch and more", map: "de_vertigo" },
  { id: "play-proleague", key: "pro", label: "Pro League", desc: "Ranked 5v5 for high-rank players", map: "de_inferno" },
  { id: "play-tournaments", key: "tournaments", label: "Tournaments", desc: "5v5 events on Legacy-X servers", map: "de_ancient" },
]


const TOURNAMENT_STATE = { registration: "Registration open", upcoming: "Starting soon", live: "Live now", finished: "Finished" } as const

export function HomePage({ onNavigate }: HomePageProps) {
  const navigate = useNavigate()
  const { data: homeStats, loading: statsLoading } = useApiQuery<HomeStats>((signal) => serversService.getHomeStats({ signal }))
  const { data: tournaments } = useApiQuery((signal) => tournamentsService.list({ signal }), { queryKey: "home-tournaments" })

  // On wide screens the card under the pointer stretches to twice the width of the others; with none hovered the 5x5 card is the wide one.
  const [activeMode, setActiveMode] = useState<ModeKey | null>(null)
  const wide = (key: ModeKey) => (activeMode === null ? key === "5x5" : activeMode === key)

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
    <div className="lx-glass-page @container flex flex-col gap-5 p-4 @2xl:p-6">
      {/* Hero */}
      <div className="lx-glass relative flex flex-col gap-4 overflow-hidden rounded-xl p-8 @2xl:p-10">
        <picture className="pointer-events-none absolute inset-0">
          <OptimizedImage src={homeHeroGif} width={480} height={268} priority alt="" aria-hidden="true" className="h-full w-full object-cover opacity-35" />
        </picture>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--card-surface)]/85 via-[var(--card-surface)]/60 to-transparent" />
        <div aria-hidden="true" className="lx-hero-glow pointer-events-none absolute -inset-10" />
        <div aria-hidden="true" className="lx-hero-grid pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent" />

        <div className="relative z-10 flex w-fit items-center gap-2">
          {(homeStats?.playersOnline ?? 0) > 0 ? (
            <>
              <span className="lx-live-dot size-1.5 rounded-full bg-[var(--status-green)]" />
              <span className="text-xs font-medium text-[var(--text-muted)]">Live now · {homeStats?.playersOnline} playing</span>
            </>
          ) : (
            <>
              <span className="size-1.5 rounded-full bg-[var(--brand-bright)]" />
              <span className="text-xs font-medium text-[var(--text-muted)]">Mongolian CS2 community</span>
            </>
          )}
        </div>
        <div className="relative z-10 flex flex-col gap-4 @3xl:flex-row @3xl:items-end @3xl:justify-between @3xl:gap-10">
        <div className="flex shrink-0 flex-col gap-4">
        <h1 className="whitespace-nowrap text-4xl font-bold leading-[1.05] tracking-normal text-[var(--text)] md:text-6xl">
          Play ranked.<br />
          Climb to <span className="lx-brand-text">Legacy.</span>
        </h1>
        <p className="max-w-md text-[15px] leading-relaxed text-[var(--text-2)]">
          Every match on our servers counts toward your rank.
        </p>
        </div>
        <dl className="mt-3 flex @3xl:mt-0">
          {heroStats.map((stat, index) => (
            <div
              key={stat.label}
              className={cn("flex min-w-0 flex-col-reverse justify-end gap-1.5 pr-5 @3xl:pr-8", index > 0 && "border-l border-[var(--line)] pl-5 @3xl:pl-8")}
            >
              <dt className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium uppercase leading-tight tracking-wide text-[var(--text-muted)] @2xl:text-xs">
                {stat.flagship && Boolean(stat.value) && <span className="lx-live-dot size-1.5 shrink-0 rounded-full bg-[var(--status-green)]" />}
                {stat.label}
              </dt>
              <dd className={cn("text-xl font-semibold leading-none @2xl:text-[28px]", stat.flagship ? "text-[var(--brand-bright)]" : "text-[var(--text)]")}>
                {statsLoading && stat.value === undefined ? <Skeleton className="h-5 w-10 @2xl:h-7 @2xl:w-12" /> : <AnimatedNumber value={stat.value} />}
              </dd>
            </div>
          ))}
        </dl>
        </div>
      </div>

      {/* Mode cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:flex" onMouseLeave={() => setActiveMode(null)}>
        {MODE_CARDS.map((mode, index) => {
          const status = modeStatus(mode.key)
          const art = cs2MapArtwork(mode.map)
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onNavigate(mode.id)}
              onMouseEnter={() => setActiveMode(mode.key)}
              onFocus={() => setActiveMode(mode.key)}
              onBlur={() => setActiveMode(null)}
              style={{ animationDelay: `${120 + index * 80}ms`, flexGrow: wide(mode.key) ? 2 : 1 }}
              className={cn(
                "lx-fx-card lx-glass group relative flex min-h-[168px] min-w-0 basis-0 flex-col justify-end overflow-hidden rounded-xl p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50",
                // Pro League is the one marked as special.
                mode.key === "pro" && "border-[var(--brand)]/50",
              )}
            >
              {art && (
                <img
                  src={art}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30 transition-[opacity,scale] duration-500 ease-out group-hover:scale-[1.03] group-hover:opacity-45"
                />
              )}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--card-surface)]/85 via-[var(--card-surface)]/55 to-transparent" />
              <div className="relative">
                <h3 className={cn("font-semibold tracking-[-0.2px] text-[var(--text)]", wide(mode.key) ? "lg:text-2xl" : "text-lg")}>{mode.label}</h3>
                <p className="mt-1 text-[13px] leading-snug text-[var(--text-muted)]">{mode.desc}</p>
              </div>
              <div className={cn("relative mt-4 flex h-4 items-center gap-1.5 transition-opacity duration-150", status ? "opacity-100" : "opacity-0")}>
                {status?.live && <span className="lx-live-dot size-1.5 rounded-full bg-[var(--status-green)]" />}
                <span className="text-xs text-[var(--text-dim)]">{status?.text ?? " "}</span>
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
