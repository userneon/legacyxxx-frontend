/** Safe Steam avatar image: always a circle that fills its allocated box, with an identity fallback. */
import { useState } from "react"

import { cn } from "@/lib/utils"
import { OptimizedImage } from "@/components/optimized-image"
import { RingFrame } from "@/components/ring-frame"
import { ART_FRAMES, isArtFrame } from "@/lib/art-frames"
import { isRingFrame } from "@/lib/ring-frames"

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
  square,
}: {
  avatar?: string
  name?: string
  className?: string
  imageClassName?: string
  style?: React.CSSProperties
  /** An avatar frame (id): the picture and its frame together fill the box the avatar was given, so a framed player sits in a row like everyone else. */
  frame?: string | null
  /** A rounded square (the default everywhere since owner 2026-11-18, "all places") or, with `square={false}`, a circle. Under a ring frame it is a circle, which the ring needs. */
  square?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const initials = (name?.trim() || "?").slice(0, 2).toUpperCase()
  const showImage = !failed && validAvatarUrl(avatar)
  const squared = square ?? !isRingFrame(frame)
  // A caller's own corner class (rounded-xl, md:rounded-2xl, ...) must never win: the picture is a circle at every width. A breakpoint class such as
  // md:rounded-2xl is not merged away by the circle below, so it turned the box into a rounded square behind the round outline (Compare, 2026-11-03).
  const boxClass = className?.split(/\s+/).filter((token) => token && !/(^|:)rounded(-|$)/.test(token)).join(" ")

  // Every avatar is a rounded square (owner request 2026-11-18, after the circles of 2026-11-01); a circle only under a ring frame.
  const picture = (
    <div style={style} className={cn("relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-secondary to-muted font-bold", boxClass, squared ? "rounded-[22%]" : "rounded-full")}>
      {showImage ? <OptimizedImage src={avatar!} width={96} height={96} alt="" className={cn("absolute inset-0 h-full w-full max-w-none object-cover object-center", imageClassName)} onError={() => setFailed(true)} /> : initials}
    </div>
  )
  if (isArtFrame(frame)) {
    // The avatar's box sits in the picture's empty window; the picture is laid over it and overflows the box by the frame's own width.
    const def = ART_FRAMES[frame!]
    return (
      <span className="relative inline-flex shrink-0">
        {picture}
        <img src={def.src} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute max-w-none select-none" style={{ width: `${100 / def.hole.w}%`, height: `${100 / def.hole.h}%`, left: `${(-def.hole.x / def.hole.w) * 100}%`, top: `${(-def.hole.y / def.hole.h) * 100}%` }} />
      </span>
    )
  }
  if (isRingFrame(frame)) {
    return (
      <span className="relative inline-flex shrink-0">
        {picture}
        <RingFrame id={frame} />
      </span>
    )
  }
  return picture
}
