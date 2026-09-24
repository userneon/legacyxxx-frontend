/** Steam avatar in a rounded square (radius ≈ 28% of the size). Fallback: the first letter of the name on --raised. */
import { useState } from "react"

import { cn } from "@/lib/utils"

function validAvatarUrl(value?: string | null) {
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
  size = 32,
  className,
  ring = false,
}: {
  avatar?: string | null
  name?: string | null
  /** Rendered size in px; the corner radius follows it. */
  size?: number
  className?: string
  /** Accent ring, e.g. the pinned "You" row. */
  ring?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const letter = (name?.trim() || "?").charAt(0).toUpperCase()
  const showImage = !failed && validAvatarUrl(avatar)

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-line-strong bg-raised font-semibold text-text-muted",
        ring && "outline outline-2 outline-offset-2 outline-accent",
        className,
      )}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), fontSize: Math.max(10, Math.round(size * 0.4)) }}
    >
      {!loaded && letter}
      {showImage && (
        <img
          src={avatar!}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          data-loaded={loaded}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </span>
  )
}
