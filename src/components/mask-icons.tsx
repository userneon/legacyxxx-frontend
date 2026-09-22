import type { CSSProperties } from "react"

import knifeIcon from "@/assets/icons/knife.png"
import podiumIcon from "@/assets/icons/podium.png"
import stopwatchIcon from "@/assets/icons/stopwatch.png"
import { cn } from "@/lib/utils"

/**
 * Icon from a PNG silhouette, painted in currentColor so it takes the same text colours
 * (idle, hover, active) as the lucide icons next to it.
 */
function maskIcon(src: string) {
  const mask: CSSProperties = {
    maskImage: `url(${src})`,
    WebkitMaskImage: `url(${src})`,
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskPosition: "center",
  }
  return function MaskIcon({ className }: { className?: string }) {
    return <span aria-hidden="true" className={cn("inline-block size-4 shrink-0 bg-current", className)} style={mask} />
  }
}

export const KnifeIcon = maskIcon(knifeIcon)
export const PodiumIcon = maskIcon(podiumIcon)
export const StopwatchIcon = maskIcon(stopwatchIcon)
