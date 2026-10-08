/** LEGACY-X dark glass UI: safe Steam avatar image that always fills its allocated box, with an identity fallback. */
import { useState } from "react"

import { cn } from "@/lib/utils"
import { OptimizedImage } from "@/components/optimized-image"
import { FrameOverlay } from "@/components/frame-overlay"
import { frameArt } from "@/lib/cosmetics"

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
  /** An avatar frame (id) drawn around the picture without changing its size; room is left around it. */
  frame?: string | null
}) {
  const [failed, setFailed] = useState(false)
  const initials = (name?.trim() || "?").slice(0, 2).toUpperCase()
  const showImage = !failed && validAvatarUrl(avatar)

  const picture = (
    <div style={style} className={cn("relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-secondary to-muted font-bold", frame && frameArt(frame) && "z-0", className)}>
      {showImage ? <OptimizedImage src={avatar!} width={96} height={96} alt="" className={cn("absolute inset-0 h-full w-full max-w-none object-cover object-center", imageClassName)} onError={() => setFailed(true)} /> : initials}
    </div>
  )
  if (!frame || !frameArt(frame)) return picture
  return (
    <span className="relative inline-flex shrink-0 mx-2">
      {picture}
      <FrameOverlay frame={frame} />
    </span>
  )
}
