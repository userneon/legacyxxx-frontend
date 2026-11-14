import { clanArtSrc } from "@/api/clans"
import { bannerClass } from "@/lib/cosmetics"
import { cn } from "@/lib/utils"

/**
 * A player's banner behind their row or card in a list (owner request 2026-11-07: wherever the banner is worn it shows): the same banner as on their profile,
 * soft and fading out to the left so the text stays readable. The parent must be `relative isolate` and clip its overflow. Their own picture (Profile customize)
 * wins over a design; nothing for an unknown key.
 */
export function NameBanner({ fx, image, className }: { fx?: string | null; image?: string | null; className?: string }) {
  const src = clanArtSrc(image)
  if (src) {
    return (
      <span aria-hidden="true" className={cn("lx-row-banner pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
        <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
      </span>
    )
  }
  const cls = bannerClass(fx)
  if (!cls) return null
  return <span aria-hidden="true" className={cn("lx-row-banner pointer-events-none absolute inset-0 -z-10 overflow-hidden", cls, className)} />
}
