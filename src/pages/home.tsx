/** Home, a calm dashboard: the slider, your numbers, your last matches, where to play, the top of the ladder, then the community. One section under another. */
import { HomeReviewsCard } from "@/components/home-reviews"
import { DiscordCard } from "@/components/discord-strip"
import { TikTokCard } from "@/components/home-tiktok"
import type { PageId } from "@/api/types"
import { HomeHero, LiveNow } from "@/components/home-open"
import { LastMatches, StatsRow } from "@/components/home-parts"
import { TopPlayers } from "@/components/home-top-players"
import { useNavigate } from "react-router-dom"
import { useActiveEvent } from "@/hooks/use-active-event"
import { eventGreeting } from "@/lib/site-events"

interface HomePageProps {
  onNavigate: (page: PageId) => void
}

export function HomePage({ onNavigate }: HomePageProps) {
  const greeting = eventGreeting(useActiveEvent()?.theme)
  const navigate = useNavigate()
  return (
    <div className="lx-open @container flex flex-1 flex-col p-4 @2xl:p-6">
      {greeting && <div className="mb-3"><span className="lx-event-greeting">{greeting}</span></div>}
      <div className="lx-stack flex flex-1 flex-col gap-10">
        <HomeHero onNavigate={onNavigate} />
        <StatsRow />
        <div className="grid grid-cols-1 gap-12 @4xl:grid-cols-2">
          <LiveNow onNavigate={onNavigate} />
          <TopPlayers onOpenProfile={(steamId) => navigate(`/profile/${encodeURIComponent(steamId)}`)} onViewAll={() => onNavigate("leaders")} />
        </div>
        <LastMatches />
        <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-3">
          <HomeReviewsCard onOpen={() => onNavigate("feedback")} />
          <TikTokCard />
          <DiscordCard />
        </div>
      </div>
    </div>
  )
}
