/** LEGACY-X Home: hero, live stats, play modes, the top of the ladder, reviews and Discord. */
import { useState } from "react"
import { cn } from "@/lib/utils"
import { serversService } from "@/api"
import { tournamentsService } from "@/api/tournaments"
import type { HomeStats, PageId } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
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
    <div className="@container flex flex-col gap-5 p-4 @2xl:p-6">
      {/* The community right now */}
      <dl aria-label="Legacy-X right now" className="lx-stat-grid grid-cols-3">
        {heroStats.map((stat) => (
          <div key={stat.label} className="lx-stat-cell">
            <dt className="lx-stat-label flex items-center gap-1.5 text-[var(--text-muted)]">
              {stat.flagship && Boolean(stat.value) && <span className="lx-live-dot size-1.5 shrink-0 rounded-full bg-[var(--status-green)]" />}
              {stat.label}
            </dt>
            <dd className={cn("text-[26px] font-bold leading-none", stat.flagship ? "text-[var(--brand-bright)]" : "text-[var(--text)]")}>
              {statsLoading && stat.value === undefined ? <Skeleton className="h-6 w-14" /> : <AnimatedNumber value={stat.value} />}
            </dd>
          </div>
        ))}
      </dl>

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
