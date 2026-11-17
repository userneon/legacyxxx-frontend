import type { PageId } from "@/api/types"
import hero5x5 from "@/assets/home/hero-5x5.webp"
import heroProfile from "@/assets/home/hero-profile.webp"
import heroShop from "@/assets/home/hero-shop.webp"

/**
 * A picture across the top of a page (owner request 2026-11-17): the owner's agent on the right, fading out to the left, the top bar lying over it. Only the pages listed here have one.
 * `path` limits it to that exact address (the Shop's other tabs have none).
 */
const HEROES: Partial<Record<PageId, { src: string; title: string; line: string; position: string; path?: string; prefix?: boolean }>> = {
  shop: { src: heroShop, title: "Shop", line: "Ranks, models, effects and roles. Cosmetics only.", position: "80% 8%", path: "/shop" },
  profile: { src: heroProfile, title: "Profile", line: "Your numbers and your look.", position: "80% 10%", path: "/profile", prefix: true },
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
  // Fixed to the page panel: the picture stays while the page scrolls over it, so the sky and its colours run to the bottom of a long page.
  return (
    <section
      aria-label={hero.title}
      style={{ left: "var(--lx-panel-left, 0px)", right: "var(--lx-panel-right, 0px)", top: "var(--lx-panel-top, 0px)", bottom: "var(--lx-panel-bottom, 0px)" }}
      className="pointer-events-none fixed z-0 overflow-hidden"
    >
      <img src={hero.src} alt="" aria-hidden="true" decoding="async" style={{ objectPosition: hero.position }} className="absolute inset-0 size-full object-cover [mask-image:linear-gradient(90deg,transparent_8%,rgba(0,0,0,0.5)_34%,#000_64%)]" />
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,6,6,0.55)_0%,rgba(6,6,6,0.1)_14%,rgba(6,6,6,0.22)_45%,rgba(6,6,6,0.7)_100%)]" />
    </section>
  )
}
