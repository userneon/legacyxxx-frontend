/** LEGACY-X Home: the hero slider, live stats, play modes, the top of the ladder, reviews and Discord. */
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { serversService } from "@/api"
import { tournamentsService } from "@/api/tournaments"
import type { HomeStats, PageId } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { HomeHeroSlider } from "@/components/home-hero-slider"
import { HomeReviews } from "@/components/home-reviews"
import { DiscordStrip } from "@/components/discord-strip"
import { TopPlayers } from "@/components/home-top-players"
import { useNavigate } from "react-router-dom"
import { Play } from "lucide-react"
import { formatDate } from "@/lib/preferences"
import rankedArt from "@/assets/home/mode-ranked.webp"
import funArt from "@/assets/home/mode-fun.webp"
import proArt from "@/assets/home/mode-pro.webp"
import eventsArt from "@/assets/home/mode-events.webp"

interface HomePageProps {
  onNavigate: (page: PageId) => void
}

type ModeKey = "5x5" | "fun" | "pro" | "tournaments"
const MODE_CARDS: { id: PageId; key: ModeKey; label: string; tag: string; desc: string; art: string }[] = [
  { id: "play-5vs5", key: "5x5", label: "5x5 Matches", tag: "Ranked", desc: "Competitive 5v5. Every match counts toward your rank.", art: rankedArt },
  { id: "play-fun", key: "fun", label: "Fun Mode", tag: "Casual", desc: "Surf, aim, deathmatch and more.", art: funArt },
  { id: "play-proleague", key: "pro", label: "Pro League", tag: "High rank", desc: "Ranked 5v5 for high-rank players.", art: proArt },
  { id: "play-tournaments", key: "tournaments", label: "Tournaments", tag: "Events", desc: "5v5 events on LEGACY-X servers.", art: eventsArt },
]


const TOURNAMENT_STATE = { registration: "Registration open", upcoming: "Starting soon", live: "Live now", finished: "Finished" } as const

export function HomePage({ onNavigate }: HomePageProps) {
  const navigate = useNavigate()
  const { data: homeStats, loading: statsLoading } = useApiQuery<HomeStats>((signal) => serversService.getHomeStats({ signal }))
  const { data: tournaments } = useApiQuery((signal) => tournamentsService.list({ signal }), { queryKey: "home-tournaments" })

  // On wide screens the card under the pointer stretches to twice the width of the others; with none hovered the 5x5 card is the wide one.
  const [activeMode, setActiveMode] = useState<ModeKey | null>(null)
  // A short pause before a card opens, so the pointer passing over a card on its way elsewhere does not make the row jump.
  const hoverTimer = useRef<number | undefined>(undefined)
  const hoverMode = (key: ModeKey) => {
    window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setActiveMode(key), 140)
  }
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
      return current ? { text: current.startsAt && (current.phase === "registration" || current.phase === "upcoming") ? `Next: ${formatDate(current.startsAt)}` : TOURNAMENT_STATE[current.phase], live: current.phase === "live" } : { text: "No tournament scheduled", live: false }
    }
    const players = homeStats?.modes?.[key]
    if (players === undefined) return null
    return players > 0 ? { text: `${players} playing now`, live: true } : { text: "No one playing right now", live: false }
  }

  return (
    <div className="lx-glass-page @container flex flex-col gap-5 p-4 @2xl:p-6">
      <HomeHeroSlider
        onNavigate={onNavigate}
        stats={heroStats}
        statsLoading={statsLoading}
        rankedText={modeStatus("5x5")?.live ? modeStatus("5x5")!.text : null}
        tournamentText={modeStatus("tournaments")?.text ?? null}
      />

      {/* Mode cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:flex" onMouseLeave={() => { window.clearTimeout(hoverTimer.current); setActiveMode(null) }}>
        {MODE_CARDS.map((mode, index) => {
          const status = modeStatus(mode.key)
          const isWide = wide(mode.key)
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onNavigate(mode.id)}
              onMouseEnter={() => hoverMode(mode.key)}
              onFocus={() => setActiveMode(mode.key)}
              onBlur={() => setActiveMode(null)}
              style={{ animationDelay: `${120 + index * 80}ms`, flexGrow: isWide ? 2 : 1 }}
              className={cn(
                "lx-fx-card lx-glass [--lx-grow-duration:1400ms] [--lx-grow-ease:cubic-bezier(0.45,0,0.25,1)] group relative flex min-h-[236px] min-w-0 basis-0 flex-col justify-end overflow-hidden rounded-xl p-5 text-left transition-[flex-grow,border-color,box-shadow] duration-[1400ms] ease-[cubic-bezier(0.45,0,0.25,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50",
                isWide && "border-[var(--brand)]/60 shadow-[0_18px_40px_-20px_var(--brand)]",
              )}
            >
              <img
                src={mode.art}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className={cn(
                  "pointer-events-none absolute bottom-0 right-0 h-[118%] w-auto max-w-none object-contain object-bottom transition-[opacity,translate] duration-[1400ms] ease-[cubic-bezier(0.45,0,0.25,1)]",
                  isWide ? "translate-x-0 opacity-100" : "translate-x-2 opacity-25",
                )}
              />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--card-surface)]/85 via-[var(--card-surface)]/30 to-transparent" />
              <span className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card-surface)]/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                <span className="size-1.5 rounded-full bg-[var(--brand-bright)]" />
                {mode.tag}
              </span>
              <div className="relative">
                <h3 className="text-2xl font-semibold leading-tight tracking-[-0.2px] text-[var(--text)]">{mode.label}</h3>
                <p className="mt-1 max-w-[200px] text-[13px] leading-snug text-[var(--text-muted)]">{mode.desc}</p>
              </div>
              <div className={cn("relative mt-4 flex h-9 items-center justify-between gap-3 transition-opacity duration-300", status ? "opacity-100" : "opacity-0")}>
                <span className="flex items-center gap-1.5">
                  {status?.live && <span className="lx-live-dot size-1.5 rounded-full bg-[var(--status-green)]" />}
                  <span className="whitespace-nowrap text-xs text-[var(--text-dim)]">{status?.text ?? " "}</span>
                </span>
                <span
                  aria-hidden={!isWide}
                  className={cn(
                    "lx-primary-button absolute right-0 top-0 inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.45,0,0.25,1)]",
                    isWide ? "translate-y-0 opacity-100 delay-300" : "pointer-events-none translate-y-1 opacity-0",
                  )}
                >
                  <Play className="size-3.5 fill-current" />
                  Play now
                </span>
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
