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
import heroSkinCt from "@/assets/home/hero-skin-ct.webp"
import heroProfile from "@/assets/home/hero-profile.webp"
import heroShop from "@/assets/home/hero-shop.webp"
import cutShop from "@/assets/agents/shop.webp"
import cutProfile from "@/assets/agents/profile.webp"
import cutSkin from "@/assets/agents/skin.webp"
import cutSkinCt from "@/assets/agents/skin-ct.webp"
import cutClan from "@/assets/agents/clan.webp"
import cutWallet from "@/assets/agents/wallet.webp"
import cutFun from "@/assets/agents/fun.webp"
import cutPro from "@/assets/agents/pro.webp"
import cutTournament from "@/assets/agents/tournament.webp"
import cutReviews from "@/assets/agents/reviews.webp"
import cutLeaders from "@/assets/agents/leaders.webp"
import cutPenalties from "@/assets/agents/penalties.webp"
import cutFiveV from "@/assets/agents/5x5.webp"

/**
 * A picture across the top of a page (owner request 2026-11-17): the owner's agent on the right, fading out to the left, the top bar lying over it. Only the pages listed here have one.
 * `path` limits it to that exact address (the Shop's other tabs have none).
 */
const HEROES: Partial<Record<PageId, { src: string; lq: string; title: string; line: string; position: string; path?: string; prefix?: boolean; ct?: { src: string; lq: string } }>> = {
  home: { src: agentHero, lq: LQ["agent-hero"], title: "Home", line: "", position: "75% 8%" },
  shop: { src: heroShop, lq: LQ["hero-shop"], title: "Shop", line: "Ranks, models, effects and roles. Cosmetics only.", position: "80% 8%", path: "/shop" },
  profile: { src: heroProfile, lq: LQ["hero-profile"], title: "Profile", line: "Your numbers and your look.", position: "80% 10%", path: "/profile", prefix: true },
  skinchanger: { src: heroSkin, lq: LQ["hero-skin"], title: "Skinchanger", line: "Your skins, knives and gloves.", position: "80% 20%", ct: { src: heroSkinCt, lq: LQ["hero-skin-ct"] } },
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

export function pageHero(page: PageId, pathname: string, team: "t" | "ct" = "t") {
  const entry = HEROES[page]
  if (!entry) return null
  const hero = team === "ct" && entry.ct ? { ...entry, ...entry.ct } : entry
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
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[clamp(420px,56.25vw,1300px)] overflow-hidden [mask-image:linear-gradient(180deg,#000_64%,transparent)]">
        {layers.map((layer) => (
          <div key={layer.id} className={cn("absolute inset-0 transition-opacity duration-[700ms] ease-out motion-reduce:transition-none", layer.id === shown ? "opacity-100" : "opacity-0")}>
            <img src={layer.hero.lq} alt="" aria-hidden="true" style={{ objectPosition: layer.hero.position }} className="absolute inset-0 size-full origin-[78%_0] scale-[1.05] object-cover blur-xl [mask-image:linear-gradient(90deg,transparent_8%,rgba(0,0,0,0.5)_34%,#000_64%)]" />
            <ArtImage src={layer.hero.src} alt="" decoding="async" style={{ objectPosition: layer.hero.position }} className="absolute inset-0 size-full origin-[78%_0] scale-[1.05] object-cover [mask-image:linear-gradient(90deg,transparent_8%,rgba(0,0,0,0.5)_34%,#000_64%)]" />
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-transparent" />
            <div className="lx-grain absolute inset-0" />
          </div>
        ))}
      </div>
      {/* What stays while the page scrolls: only the colour of the evening. */}
      <div
        aria-hidden="true"
        style={{ left: "var(--lx-panel-left, 0px)", right: "var(--lx-panel-right, 0px)", top: "var(--lx-panel-top, 0px)", bottom: "var(--lx-panel-bottom, 0px)" }}
        className={cn("pointer-events-none fixed z-0 bg-[radial-gradient(70%_45%_at_100%_100%,rgba(255,140,50,0.09),transparent),linear-gradient(180deg,rgba(14,20,46,0.28),rgba(6,6,6,0)_85%)] transition-opacity duration-700 motion-reduce:transition-none", shown === null ? "opacity-0" : "opacity-100")}
      />
    </>
  )
}

/**
 * The page picture as a banner in the page instead of a background behind it (owner request 2026-11-18: "as a background the picture looks poor, try a hero banner; make
 * several designs"). `bg` is the picture behind the page (the earlier way); the others sit in the flow of the page, at the picture's own size or smaller, with the page's
 * name over it. The mode is picked with ?hero=card|strip|split|compact|bg in the address and kept in this browser.
 */
export type HeroMode = "bg" | "card" | "strip" | "split" | "compact" | "agent"
const MODES: HeroMode[] = ["bg", "card", "strip", "split", "compact", "agent"]

export function readHeroMode(): HeroMode {
  try {
    const asked = new URLSearchParams(window.location.search).get("hero")
    if (asked && (MODES as string[]).includes(asked)) { window.localStorage.setItem("lx-hero-mode", asked); return asked as HeroMode }
  } catch { /* no storage: the default */ }
  return "agent"
}

/** The agent alone, background removed, per picture. */
const CUTS: Record<string, string> = {
  [heroShop]: cutShop, [heroProfile]: cutProfile, [heroSkin]: cutSkin, [heroSkinCt]: cutSkinCt, [heroClan]: cutClan, [heroWallet]: cutWallet, [heroFun]: cutFun,
  [heroPro]: cutPro, [heroTournament]: cutTournament, [heroReviews]: cutReviews, [heroLeaders]: cutLeaders, [heroPenalties]: cutPenalties, [hero5x5]: cutFiveV,
}

/** The backdrop behind the agent (owner request 2026-11-18: "show me many backgrounds"): ?bg=dusk|aurora|spotlight|grid|contour|ember|frost|mono|ambient, kept in this browser. */
export const HERO_BGS = ["dusk", "aurora", "spotlight", "grid", "contour", "ember", "frost", "mono", "ambient"] as const
export type HeroBg = (typeof HERO_BGS)[number] | "none"
export function readHeroBg(): HeroBg {
  try {
    const asked = new URLSearchParams(window.location.search).get("bg")
    if (asked && (HERO_BGS as readonly string[]).includes(asked)) { window.localStorage.setItem("lx-hero-bg", asked); return asked as HeroBg }
    const kept = window.localStorage.getItem("lx-hero-bg")
    if (kept && (HERO_BGS as readonly string[]).includes(kept)) return kept as HeroBg
  } catch { /* no storage: the default */ }
  return "none"
}

const WASH = "linear-gradient(90deg, rgba(6,8,14,0.94) 0%, rgba(6,8,14,0.62) 36%, rgba(6,8,14,0.08) 68%, transparent 100%)"

export function HeroBanner({ hero, mode }: { hero: Hero; mode: Exclude<HeroMode, "bg"> }) {
  const picture = (className: string) => <ArtImage src={hero.src} alt="" decoding="async" style={{ objectPosition: hero.position }} className={cn("absolute inset-0 size-full object-cover", className)} />
  const words = (size: string) => (
    <div className="relative z-10 flex h-full max-w-[560px] flex-col justify-center gap-1.5 px-8 max-sm:px-5">
      <div className={cn("font-bold leading-[1.02] tracking-[-0.03em] text-[var(--text)]", size)}>{hero.title}</div>
      {hero.line && <p className="max-w-[420px] text-[14px] leading-snug text-[var(--text-muted)]">{hero.line}</p>}
    </div>
  )
  if (mode === "agent") {
    const cut = CUTS[hero.src]
    const bg = readHeroBg()
    return (
      <section aria-hidden="true" className="relative isolate mb-4 ml-[calc(50%-50vw)] h-[clamp(240px,22vw,340px)] w-screen shrink-0 overflow-hidden">
        {bg !== "none" && <div className={cn("lx-bgfx absolute inset-0", `lx-bgfx-${bg}`)} />}
        {bg === "ambient" && cut && <img aria-hidden="true" src={cut} alt="" className="pointer-events-none absolute -right-[6%] top-[-30%] h-[170%] w-auto max-w-none scale-[1.4] opacity-[0.38] blur-[70px] saturate-150" />}
        <div className="relative mx-auto h-full w-full max-w-[var(--lx-w)] pt-14">
          {words("text-[clamp(32px,3.6vw,52px)]")}
          {cut && <img key={cut} src={cut} alt="" decoding="async" className="pointer-events-none absolute bottom-0 right-0 h-[80%] w-auto max-w-[55%] select-none object-contain object-bottom [mask-image:linear-gradient(180deg,#000_78%,transparent)] max-sm:opacity-60" />}
        </div>
      </section>
    )
  }
  if (mode === "card") {
    return (
      <section aria-hidden="true" className="relative isolate mb-6 mt-2 h-[clamp(190px,17vw,290px)] shrink-0 overflow-hidden rounded-[20px] border border-white/10 bg-[#07080d]">
        {picture("")}
        <div className="absolute inset-0" style={{ background: WASH }} />
        {words("text-[clamp(28px,3.2vw,44px)]")}
      </section>
    )
  }
  if (mode === "strip") {
    return (
      <section aria-hidden="true" className="relative isolate mb-6 ml-[calc(50%-50vw)] h-[clamp(250px,24vw,380px)] w-screen shrink-0 overflow-hidden [mask-image:linear-gradient(180deg,#000_70%,transparent)]">
        {picture("")}
        <div className="absolute inset-0" style={{ background: WASH }} />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="relative mx-auto h-full w-full max-w-[var(--lx-w)] pt-14">{words("text-[clamp(32px,3.6vw,52px)]")}</div>
      </section>
    )
  }
  if (mode === "split") {
    return (
      <section aria-hidden="true" className="relative isolate mb-6 mt-2 grid h-[clamp(190px,17vw,290px)] shrink-0 grid-cols-[minmax(0,5fr)_minmax(0,7fr)] overflow-hidden rounded-[20px] border border-white/10 bg-[rgb(10_11_15/0.7)] max-md:grid-cols-1">
        <div className="relative z-10 flex items-center">{words("text-[clamp(28px,3vw,42px)]")}</div>
        <div className="relative max-md:hidden [mask-image:linear-gradient(90deg,transparent,#000_30%)]">{picture("")}</div>
      </section>
    )
  }
  return (
    <section aria-hidden="true" className="relative isolate mb-5 mt-2 h-[clamp(110px,9vw,150px)] shrink-0 overflow-hidden rounded-[20px] border border-white/10 bg-[#07080d]">
      <ArtImage src={hero.src} alt="" decoding="async" style={{ objectPosition: `${hero.position.split(" ")[0]} 30%` }} className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0" style={{ background: WASH }} />
      {words("text-[clamp(24px,2.4vw,34px)]")}
    </section>
  )
}
