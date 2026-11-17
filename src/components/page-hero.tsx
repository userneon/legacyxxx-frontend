import type { PageId } from "@/api/types"
import hero5x5 from "@/assets/home/hero-5x5.webp"
import heroShop from "@/assets/home/hero-shop.webp"

/**
 * A picture across the top of a page (owner request 2026-11-17): the owner's agent on the right, fading out to the left, the top bar lying over it. Only the pages listed here have one.
 * `path` limits it to that exact address (the Shop's other tabs have none).
 */
const HEROES: Partial<Record<PageId, { src: string; title: string; line: string; position: string; path?: string }>> = {
  shop: { src: heroShop, title: "Shop", line: "Ranks, models, effects and roles. Cosmetics only.", position: "80% 8%", path: "/shop" },
  "play-5vs5": { src: hero5x5, title: "5x5 Matches", line: "Competitive 5v5. Every match counts toward your rank.", position: "80% 8%" },
}

export function pageHero(page: PageId, pathname: string) {
  const hero = HEROES[page]
  if (!hero) return null
  if (hero.path && pathname.replace(/\/$/, "") !== hero.path) return null
  return hero
}

export function PageHero({ hero }: { hero: NonNullable<ReturnType<typeof pageHero>> }) {
  return (
    <section aria-label={hero.title} className="relative isolate h-[320px] w-full shrink-0 overflow-hidden min-[900px]:h-[420px]">
      <img src={hero.src} alt="" aria-hidden="true" decoding="async" style={{ objectPosition: hero.position }} className="absolute inset-0 -z-10 size-full object-cover [mask-image:linear-gradient(90deg,transparent_8%,rgba(0,0,0,0.5)_34%,#000_64%),linear-gradient(180deg,#000_66%,transparent)] [mask-composite:intersect] [-webkit-mask-composite:source-in]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />
    </section>
  )
}
