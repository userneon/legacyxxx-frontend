import { bannerClass } from "@/lib/cosmetics"
import { cn } from "@/lib/utils"

/**
 * The banner a player wears: a strip across the top of their profile card (the card must be `relative` and clip its overflow). With `fade` it melts
 * into the card instead of ending in a clean edge. Draws nothing for an unknown key.
 */
export function ProfileBanner({ fx, fade, className }: { fx: string | null | undefined; fade?: boolean; className?: string }) {
  const cls = bannerClass(fx)
  if (!cls) return null
  return <div aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 top-0 h-[150px] overflow-hidden", cls, fade && "lx-banner-fade", className)} />
}
