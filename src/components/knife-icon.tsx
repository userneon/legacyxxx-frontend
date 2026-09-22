import type { CSSProperties } from "react"

import knifeIcon from "@/assets/icons/knife.png"
import { cn } from "@/lib/utils"

const mask: CSSProperties = {
  maskImage: `url(${knifeIcon})`,
  WebkitMaskImage: `url(${knifeIcon})`,
  maskSize: "contain",
  WebkitMaskSize: "contain",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskPosition: "center",
}

/** Knife glyph painted in currentColor, so it follows the same text colours as the lucide icons. */
export function KnifeIcon({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-4 bg-current", className)} style={mask} />
}
