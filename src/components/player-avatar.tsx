/** LEGACY-X dark glass UI: safe Steam avatar image with an identity fallback. */
import { useState } from "react"

import { cn } from "@/lib/utils"

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
}: {
  avatar?: string
  name?: string
  className?: string
  imageClassName?: string
}) {
  const [failed, setFailed] = useState(false)
  const initials = (name?.trim() || "?").slice(0, 2).toUpperCase()
  const showImage = !failed && validAvatarUrl(avatar)

  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-secondary to-muted font-bold", className)}>
      {showImage ? <img src={avatar} alt="" className={cn("size-full object-cover", imageClassName)} onError={() => setFailed(true)} /> : initials}
    </div>
  )
}
