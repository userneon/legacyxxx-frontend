import type { ImgHTMLAttributes } from "react"

import { useActiveEvent } from "@/hooks/use-active-event"
import { cn } from "@/lib/utils"

/**
 * The LXC wordmark. While the New Year event runs (the staff schedule it; the same event dresses Home and the app) it wears a Santa hat and a little snow
 * (owner request 2026-11-18); on every other day it is the plain mark. The hat sticks out above the box, so the picture is drawn a little larger from the bottom-left corner.
 */
export function SiteLogo({ className, ...props }: Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">) {
  const event = useActiveEvent()
  const newYear = event?.theme === "new-year"
  return <img {...props} src={newYear ? "/lxc-monogram-newyear.webp" : "/lxc-monogram.png"} alt="LXC" className={cn(className, newYear && "lx-logo-ny")} />
}
