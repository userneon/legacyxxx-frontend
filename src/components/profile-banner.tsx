import { bannerClass } from "@/lib/cosmetics"
import { cn } from "@/lib/utils"

/** The banner a player wears, drawn behind the top of their profile card (the card must be `relative` and clip its overflow). Draws nothing for an unknown key. */
export function ProfileBanner({ fx, className }: { fx: string | null | undefined; className?: string }) {
  const cls = bannerClass(fx)
  if (!cls) return null
  return <div aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 top-0 h-[230px] overflow-hidden", cls, className)} />
}
