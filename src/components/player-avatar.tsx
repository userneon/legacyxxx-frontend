/** Safe Steam avatar image: always a circle that fills its allocated box, with an identity fallback. */
import { useState } from "react"

import { cn } from "@/lib/utils"
import { FrozenOrb } from "@/components/frozen-orb"
import { ORB_ID, type FrameLook } from "@/lib/frame-look"
import { OptimizedImage } from "@/components/optimized-image"

function validAvatarUrl(value?: string) {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

export function PlayerAvatar({
  avatar,
  name,
  className,
  imageClassName,
  style,
  frame,
  frameLook,
}: {
  avatar?: string
  name?: string
  className?: string
  imageClassName?: string
  style?: React.CSSProperties
  /** An avatar frame (id): the picture and its frame together fill the box the avatar was given, so a framed player sits in a row like everyone else. */
  frame?: string | null
  /** The settings of the Crystal Orb when that is the frame. */
  frameLook?: FrameLook | null
}) {
  const [failed, setFailed] = useState(false)
  const initials = (name?.trim() || "?").slice(0, 2).toUpperCase()
  const showImage = !failed && validAvatarUrl(avatar)

  // Every avatar is a circle (owner request 2026-11-01). Wearing the Crystal Orb, a still picture of the orb is drawn over it, overflowing the box (live orbs are only on profiles and in the Shop).
  const picture = (
    <div style={style} className={cn("relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-secondary to-muted font-bold", className, "rounded-full")}>
      {showImage ? <OptimizedImage src={avatar!} width={96} height={96} alt="" className={cn("absolute inset-0 h-full w-full max-w-none object-cover object-center", imageClassName)} onError={() => setFailed(true)} /> : initials}
      {/* A thin outline over the picture, so a dark avatar still reads as a circle on the dark page. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" />
    </div>
  )
  if (frame !== ORB_ID) return picture
  return (
    <span className="relative inline-flex shrink-0">
      {picture}
      <FrozenOrb look={frameLook} />
    </span>
  )
}
