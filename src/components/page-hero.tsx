import type { PageId } from "@/api/types"
import hero5x5 from "@/assets/home/hero-5x5.webp"
import heroClan from "@/assets/home/hero-clan.webp"
import heroSkin from "@/assets/home/hero-skin.webp"
import heroProfile from "@/assets/home/hero-profile.webp"
import heroShop from "@/assets/home/hero-shop.webp"

/**
 * A picture across the top of a page (owner request 2026-11-17): the owner's agent on the right, fading out to the left, the top bar lying over it. Only the pages listed here have one.
 * `path` limits it to that exact address (the Shop's other tabs have none).
 */
const HEROES: Partial<Record<PageId, { src: string; title: string; line: string; position: string; path?: string; prefix?: boolean }>> = {
  shop: { src: heroShop, title: "Shop", line: "Ranks, models, effects and roles. Cosmetics only.", position: "80% 8%", path: "/shop" },
  profile: { src: heroProfile, title: "Profile", line: "Your numbers and your look.", position: "80% 10%", path: "/profile", prefix: true },
  skinchanger: { src: heroSkin, title: "Skinchanger", line: "Your skins, knives and gloves.", position: "80% 20%" },
  clan: { src: heroClan, title: "Clans", line: "Play together.", position: "80% 20%" },
  "play-5vs5": { src: hero5x5, title: "5x5 Matches", line: "Competitive 5v5. Every match counts toward your rank.", position: "80% 8%" },
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

export function PageHero({ hero }: { hero: NonNullable<ReturnType<typeof pageHero>> }) {
  return (
    <>
      {/* The picture itself lies across the top of the page panel and scrolls away with the page. */}
      <section aria-label={hero.title} className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[360px] overflow-hidden min-[900px]:h-[520px]">
        <img src={hero.src} alt="" aria-hidden="true" decoding="async" style={{ objectPosition: hero.position }} className="absolute inset-0 size-full object-cover [mask-image:linear-gradient(90deg,transparent_8%,rgba(0,0,0,0.5)_34%,#000_64%),linear-gradient(180deg,#000_62%,transparent)] [mask-composite:intersect] [-webkit-mask-composite:source-in]" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />
      </section>
      {/* What stays while the page scrolls: only the colour of the evening, a faint navy from the top and a warm glow in the corner. */}
      <div
        aria-hidden="true"
        style={{ left: "var(--lx-panel-left, 0px)", right: "var(--lx-panel-right, 0px)", top: "var(--lx-panel-top, 0px)", bottom: "var(--lx-panel-bottom, 0px)" }}
        className="pointer-events-none fixed z-0 bg-[radial-gradient(70%_45%_at_100%_100%,rgba(255,140,50,0.09),transparent),linear-gradient(180deg,rgba(14,20,46,0.6),rgba(6,6,6,0)_85%)]"
      />
    </>
  )
}
