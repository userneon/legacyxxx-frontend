import { useId } from "react"

import { cn } from "@/lib/utils"

const HEX = /^#[0-9a-f]{6}$/i

/**
 * A grenade's flight in the trail colour a player picked: a thrown arc that fades out behind the grenade, which sits at its head.
 * The line draws itself once when shown (off for reduced motion). The colour is a plain #rrggbb from the API (never a style string).
 */
export function GrenadeTrail({ color, className }: { color?: string | null; className?: string }) {
  const tint = color && HEX.test(color) ? color : "#a3a3a3"
  const id = useId().replace(/:/g, "")
  return (
    <svg aria-hidden="true" viewBox="0 0 200 120" className={cn("block aspect-[5/3] w-full max-w-[220px]", className)}>
      <defs>
        <linearGradient id={`trail-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={tint} stopOpacity="0" />
          <stop offset="70%" stopColor={tint} stopOpacity="0.85" />
          <stop offset="100%" stopColor={tint} stopOpacity="1" />
        </linearGradient>
        <radialGradient id={`glow-${id}`}>
          <stop offset="0%" stopColor={tint} stopOpacity="0.55" />
          <stop offset="100%" stopColor={tint} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M14 104 Q 92 -6 168 52" fill="none" stroke={`url(#trail-${id})`} strokeWidth="3.2" strokeLinecap="round" pathLength={1} className="lx-trail-draw" />
      <circle cx="168" cy="52" r="16" fill={`url(#glow-${id})`} />
      <circle cx="168" cy="52" r="5.5" fill="#d4d4d4" stroke="#525252" strokeWidth="1.2" />
    </svg>
  )
}
