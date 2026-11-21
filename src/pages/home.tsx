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
    <div className="lx-open @container flex flex-1 flex-col">
      <HomeHero onNavigate={onNavigate} />
      <div className="lx-stack mx-auto flex w-full max-w-[var(--lx-w)] flex-1 flex-col gap-3 p-4 @2xl:p-6">
        {greeting && <div><span className="lx-event-greeting">{greeting}</span></div>}
        <div className="lx-glass rounded-xl p-5"><StatsRow /></div>
        <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-2">
          <div className="lx-glass rounded-xl p-5"><LiveNow onNavigate={onNavigate} /></div>
          <div className="lx-glass rounded-xl p-5"><TopPlayers onOpenProfile={(steamId) => navigate(`/profile/${encodeURIComponent(steamId)}`)} onViewAll={() => onNavigate("leaders")} /></div>
        </div>
        <div className="lx-glass rounded-xl p-5"><LastMatches /></div>
        <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-3">
          <div className="lx-glass rounded-xl"><HomeReviewsCard onOpen={() => onNavigate("feedback")} /></div>
          <TikTokCard />
          <DiscordCard />
        </div>
      </div>
    </div>
  )
}
