import type { CSSProperties } from "react"

import { RING_FRAMES } from "@/lib/ring-frames"

/** A ring round the avatar: absolutely placed in the avatar's own box and overflowing it a little, so a framed player sits in a row like everyone else. CSS only. */
export function RingFrame({ id }: { id?: string | null }) {
  const def = id ? RING_FRAMES[id] : undefined
  if (!def) return null
  const style = { "--ring-a": def.colors[0], "--ring-b": def.colors[1], "--ring-c": def.colors[2] } as CSSProperties
  return (
    <span aria-hidden="true" className={`lx-ring lx-ring-${def.style}`} style={style}>
      <span className="lx-ring-glow" />
      <span className="lx-ring-spin" />
    </span>
  )
}
