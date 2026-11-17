import { useEffect, useRef, useState } from "react"

import type { PageId } from "@/api/types"
import { cn } from "@/lib/utils"
import { ArtImage } from "@/components/art-image"
import { LQ } from "@/lib/hero-lqip.generated"
import agentHero from "@/assets/home/agent-hero.webp"
import hero5x5 from "@/assets/home/hero-5x5.webp"
import heroWallet from "@/assets/home/hero-wallet.webp"
import heroFun from "@/assets/home/hero-fun.webp"
import heroPro from "@/assets/home/hero-pro.webp"
import heroPenalties from "@/assets/home/hero-penalties.webp"
import heroLeaders from "@/assets/home/hero-leaders.webp"
import heroTournament from "@/assets/home/hero-tournament.webp"
import heroReviews from "@/assets/home/hero-reviews.webp"
import heroClan from "@/assets/home/hero-clan.webp"
import heroSkin from "@/assets/home/hero-skin.webp"
import heroProfile from "@/assets/home/hero-profile.webp"
import heroShop from "@/assets/home/hero-shop.webp"

/**
 * A picture across the top of a page (owner request 2026-11-17): the owner's agent on the right, fading out to the left, the top bar lying over it. Only the pages listed here have one.
 * `path` limits it to that exact address (the Shop's other tabs have none).
 */
const HEROES: Partial<Record<PageId, { src: string; lq: string; title: string; line: string; position: string; path?: string; prefix?: boolean }>> = {
  home: { src: agentHero, lq: LQ["agent-hero"], title: "Home", line: "", position: "75% 8%" },
  shop: { src: heroShop, lq: LQ["hero-shop"], title: "Shop", line: "Ranks, models, effects and roles. Cosmetics only.", position: "80% 8%", path: "/shop" },
  profile: { src: heroProfile, lq: LQ["hero-profile"], title: "Profile", line: "Your numbers and your look.", position: "80% 10%", path: "/profile", prefix: true },
  skinchanger: { src: heroSkin, lq: LQ["hero-skin"], title: "Skinchanger", line: "Your skins, knives and gloves.", position: "80% 20%" },
  clan: { src: heroClan, lq: LQ["hero-clan"], title: "Clans", line: "Play together.", position: "80% 20%" },
  wallet: { src: heroWallet, lq: LQ["hero-wallet"], title: "Wallet", line: "", position: "80% 15%" },
  "play-fun": { src: heroFun, lq: LQ["hero-fun"], title: "Fun Mode", line: "", position: "80% 15%" },
  "play-proleague": { src: heroPro, lq: LQ["hero-pro"], title: "Pro League", line: "", position: "80% 10%" },
  "play-tournaments": { src: heroTournament, lq: LQ["hero-tournament"], title: "Tournaments", line: "", position: "80% 15%" },
  feedback: { src: heroReviews, lq: LQ["hero-reviews"], title: "Reviews", line: "", position: "80% 15%" },
  leaders: { src: heroLeaders, lq: LQ["hero-leaders"], title: "Leaders", line: "", position: "80% 15%" },
  penalties: { src: heroPenalties, lq: LQ["hero-penalties"], title: "Penalties", line: "", position: "80% 10%" },
  "play-5vs5": { src: hero5x5, lq: LQ["hero-5x5"], title: "5x5 Matches", line: "Competitive 5v5. Every match counts toward your rank.", position: "80% 8%" },
}

export function pageHero(page: PageId, pathname: string) {
  const hero = HEROES[page]
  if (!hero) return null
  if (hero.path) {
    const here = pathname.replace(/\/$/, "")
    if (hero.prefix ? !(here === hero.path || here.startsWith(`${hero.path}/`)) : here !== hero.path) return null
  }
  return hero
}

type Hero = NonNullable<ReturnType<typeof pageHero>>

/**
 * The picture behind a page. It stays mounted across pages and cross-fades: the new picture fades up over the old one, and leaving a page that has one fades it out,
 * so moving about the site never flashes or jumps (owner request 2026-11-17: "smooth page changes").
 */
export function PageHero({ hero }: { hero: Hero | null }) {
  const [layers, setLayers] = useState<Array<{ id: number; hero: Hero }>>(() => (hero ? [{ id: 0, hero }] : []))
  const [shown, setShown] = useState<number | null>(hero ? 0 : null)
  const counter = useRef(0)
  const lastSrc = useRef<string | null>(hero?.src ?? null)

  useEffect(() => {
    const src = hero?.src ?? null
    if (src === lastSrc.current) return
    lastSrc.current = src
    if (!hero) { setShown(null); return }
    const id = ++counter.current
    setLayers((current) => [...current.slice(-1), { id, hero }])
    setShown(id)
  }, [hero])

  // Layers that have faded out are dropped.
  useEffect(() => {
    const timer = window.setTimeout(() => setLayers((current) => current.filter((layer) => layer.id === shown || shown === null && layer === current[current.length - 1])), 900)
    return () => window.clearTimeout(timer)
  }, [shown])

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[clamp(420px,58vw,880px)] overflow-hidden [mask-image:linear-gradient(180deg,#000_64%,transparent)]">
        {layers.map((layer) => (
          <div key={layer.id} className={cn("absolute inset-0 transition-opacity duration-[700ms] ease-out motion-reduce:transition-none", layer.id === shown ? "opacity-100" : "opacity-0")}>
            <img src={layer.hero.lq} alt="" aria-hidden="true" style={{ objectPosition: layer.hero.position }} className="absolute inset-0 size-full origin-[78%_0] scale-[1.12] object-cover blur-xl [mask-image:linear-gradient(90deg,transparent_8%,rgba(0,0,0,0.5)_34%,#000_64%)]" />
            <ArtImage src={layer.hero.src} alt="" decoding="async" style={{ objectPosition: layer.hero.position }} className="absolute inset-0 size-full origin-[78%_0] scale-[1.12] object-cover [mask-image:linear-gradient(90deg,transparent_8%,rgba(0,0,0,0.5)_34%,#000_64%)]" />
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />
          </div>
        ))}
      </div>
      {/* What stays while the page scrolls: only the colour of the evening. */}
      <div
        aria-hidden="true"
        style={{ left: "var(--lx-panel-left, 0px)", right: "var(--lx-panel-right, 0px)", top: "var(--lx-panel-top, 0px)", bottom: "var(--lx-panel-bottom, 0px)" }}
        className={cn("pointer-events-none fixed z-0 bg-[radial-gradient(70%_45%_at_100%_100%,rgba(255,140,50,0.09),transparent),linear-gradient(180deg,rgba(14,20,46,0.6),rgba(6,6,6,0)_85%)] transition-opacity duration-700 motion-reduce:transition-none", shown === null ? "opacity-0" : "opacity-100")}
      />
    </>
  )
}
