import { clanArtSrc } from "@/api/clans"
import { bannerClass } from "@/lib/cosmetics"
import { cn } from "@/lib/utils"

/**
 * The banner a player wears: a strip across the top of their profile card (the card must be `relative` and clip its overflow). With `fade` it melts
 * into the card instead of ending in a clean edge. A banner picture of their own (Profile customize) wins over a banner design; an unknown key draws nothing.
 */
export function ProfileBanner({ fx, image, fade, className }: { fx: string | null | undefined; image?: string | null; fade?: boolean; className?: string }) {
  const src = clanArtSrc(image)
  if (src) {
    return (
      <div aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 top-0 h-[150px] overflow-hidden", fade && "lx-banner-fade", className)}>
        <img src={src} alt="" loading="eager" decoding="async" className="size-full object-cover" />
      </div>
    )
  }
  const cls = bannerClass(fx)
  if (!cls) return null
  return <div aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 top-0 h-[150px] overflow-hidden", cls, fade && "lx-banner-fade", className)} />
}
