/** LEGACY-X dark glass UI: safe Steam avatar image that always fills its allocated box, with an identity fallback. */
import { useState } from "react"

import { cn } from "@/lib/utils"
import { OptimizedImage } from "@/components/optimized-image"
import { frameArt, frameGlow } from "@/lib/cosmetics"

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
}: {
  avatar?: string
  name?: string
  className?: string
  imageClassName?: string
  style?: React.CSSProperties
  /** An avatar frame (id): the picture and its frame together fill the box the avatar was given, so a framed player sits in a row like everyone else. */
  frame?: string | null
}) {
  const [failed, setFailed] = useState(false)
  const initials = (name?.trim() || "?").slice(0, 2).toUpperCase()
  const showImage = !failed && validAvatarUrl(avatar)

  const art = frame ? frameArt(frame) : null
  const picture = (
    <div style={art ? { ...style, scale: String(art.opening), translate: `${art.dx * 100}% ${art.dy * 100}%` } : style} className={cn("relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-secondary to-muted font-bold", art && "z-0", className)}>
      {showImage ? <OptimizedImage src={avatar!} width={96} height={96} alt="" className={cn("absolute inset-0 h-full w-full max-w-none object-cover object-center", imageClassName)} onError={() => setFailed(true)} /> : initials}
    </div>
  )
  if (!art) return picture
  return (
    <span className="relative inline-flex shrink-0">
      {picture}
      <img src={art.src} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute inset-0 z-10 size-full max-w-none select-none" style={{ filter: frameGlow(frame) }} />
    </span>
  )
}
