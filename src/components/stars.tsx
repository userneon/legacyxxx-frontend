import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

/** Rating stars: filled white for the rating, outlined dim for the rest (no yellow anywhere). */
export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  const rounded = Math.round(value)
  return (
    <span className={cn("inline-flex gap-0.5", className)} role="img" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} aria-hidden style={{ width: size, height: size }} className={cn("shrink-0", rounded >= star ? "fill-accent text-accent" : "fill-transparent text-text-faint")} />
      ))}
    </span>
  )
}
