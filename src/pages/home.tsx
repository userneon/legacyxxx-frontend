/** LEGACY-X Home (bento, owner pick 2026-11-09): a slider (today one slide: the Scanner and Anti-Cheat), the player's rank and rings, the four modes, the top of the ladder, reviews and Discord. */
import { cn } from "@/lib/utils"
import { serversService } from "@/api"
import { tournamentsService } from "@/api/tournaments"
import type { HomeStats, PageId } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { HomeReviewsCard } from "@/components/home-reviews"
import { DiscordCard } from "@/components/discord-strip"
import { TikTokCard } from "@/components/home-tiktok"
import { FindPlayerPill, HeroSlider, RankPanel } from "@/components/home-bento"
import { TopPlayers } from "@/components/home-top-players"
import { useNavigate } from "react-router-dom"
import { formatDate } from "@/lib/preferences"
import rankedArt from "@/assets/home/mode-ranked.webp"
import funArt from "@/assets/home/mode-fun.webp"
import proArt from "@/assets/home/mode-pro.webp"
import eventsArt from "@/assets/home/mode-events.webp"
import { useActiveEvent } from "@/hooks/use-active-event"
import { eventGreeting } from "@/lib/site-events"

interface HomePageProps {
  onNavigate: (page: PageId) => void
}

type ModeKey = "5x5" | "fun" | "pro" | "tournaments"
const MODE_CARDS: { id: PageId; key: ModeKey; label: string; tag: string; art: string }[] = [
  { id: "play-5vs5", key: "5x5", label: "5x5 Matches", tag: "Ranked", art: rankedArt },
  { id: "play-fun", key: "fun", label: "Fun Mode", tag: "Casual", art: funArt },
  { id: "play-proleague", key: "pro", label: "Pro League", tag: "High rank", art: proArt },
  { id: "play-tournaments", key: "tournaments", label: "Tournaments", tag: "Events", art: eventsArt },
]


const TOURNAMENT_STATE = { registration: "Registration open", upcoming: "Starting soon", live: "Live now", finished: "Finished" } as const

export function HomePage({ onNavigate }: HomePageProps) {
  const greeting = eventGreeting(useActiveEvent()?.theme)
  const navigate = useNavigate()
  const { data: homeStats } = useApiQuery<HomeStats>((signal) => serversService.getHomeStats({ signal }))
  const { data: tournaments } = useApiQuery((signal) => tournamentsService.list({ signal }), { queryKey: "home-tournaments" })

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
    <div className="lx-glass-page lx-calm lx-faceit @container flex flex-1 flex-col p-4 @2xl:p-6">
      {greeting && <div className="mb-3"><span className="lx-event-greeting">{greeting}</span></div>}
      <div className="lx-bento grid flex-1 grid-cols-1 gap-3 @3xl:grid-cols-12 @3xl:[grid-template-rows:minmax(auto,1fr)_auto_minmax(auto,1fr)]">
        <HeroSlider className="@3xl:col-span-8" />
        <div className="flex flex-col gap-3 @3xl:col-span-4">
          <FindPlayerPill />
          <RankPanel />
        </div>

        {/* Mode cards: the same four cards, equal width, each with its real status. */}
        <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @3xl:col-span-12 @5xl:grid-cols-4">
          {MODE_CARDS.map((mode, index) => {
            const status = modeStatus(mode.key)
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onNavigate(mode.id)}
                style={{ animationDelay: `${120 + index * 80}ms` }}
                className="lx-fx-card lx-glass group relative flex h-[124px] min-w-0 flex-col overflow-hidden rounded-2xl p-4 text-left transition-colors hover:border-[var(--line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50"
              >
                <img
                  src={mode.art}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="pointer-events-none absolute -right-2 bottom-0 h-[112px] w-auto max-w-none object-contain object-bottom [mask-image:linear-gradient(90deg,transparent_0,#000_32%)] transition-transform duration-500 group-hover:-translate-y-0.5"
                />
                <span className="relative text-[11px] font-medium text-[var(--text-dim)]">{mode.tag}</span>
                <h3 className="relative mt-1 max-w-[55%] text-base font-semibold leading-tight text-[var(--text)]">{mode.label}</h3>
                <span className={cn("relative mt-auto flex max-w-[52%] items-center gap-1.5 text-xs transition-opacity duration-300", status ? "opacity-100" : "opacity-0")}>
                  {status?.live && <span className="lx-live-dot size-1.5 shrink-0 rounded-full bg-[var(--status-green)]" />}
                  <span className={cn("truncate", status?.live ? "text-[var(--text-2)]" : "text-[var(--text-dim)]")}>{status?.text ?? " "}</span>
                </span>
              </button>
            )
          })}
        </div>

        <TopPlayers className="@3xl:col-span-8" onOpenProfile={(steamId) => navigate(`/profile/${encodeURIComponent(steamId)}`)} onViewAll={() => onNavigate("leaders")} />
        <div className="flex flex-col gap-3 @3xl:col-span-4">
          <HomeReviewsCard onOpen={() => onNavigate("feedback")} className="flex-[0.6]" />
          <TikTokCard className="flex-1" />
          <DiscordCard className="flex-1" />
        </div>
      </div>
    </div>
  )
}
