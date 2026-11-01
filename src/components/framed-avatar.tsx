/** A Steam avatar in a round picture. Old avatar frames were taken out of the site (owner request 2026-11-01); the Crystal Orb is the one frame there is. */
import { OrbAvatar } from "@/components/orb-avatar"
import { PlayerAvatar } from "@/components/player-avatar"
import { ORB_ID, resolveLook, type FrameLook } from "@/lib/frame-look"

/** The smallest orb that is drawn live: each one is a WebGL canvas, and a page may only hold so many. */
const LIVE_ORB_MIN = 64

/**
 * `size` is the diameter in px. Wearing the Crystal Orb (`frame`), a large avatar is drawn inside the live orb and a small one is the
 * plain round picture with a ring in the orb's colour; any other `frame` is ignored.
 */
export function FramedAvatar({ avatar, name, size, frame, look }: { avatar?: string; name?: string; frame?: string | null | undefined; size: number; look?: FrameLook | null }) {
  if (frame === ORB_ID && size >= LIVE_ORB_MIN) return <OrbAvatar avatar={avatar} name={name} size={size} look={look} />
  const ring = frame === ORB_ID ? resolveLook(look).color : undefined
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <PlayerAvatar avatar={avatar} name={name} style={{ width: size, height: size, fontSize: Math.round(size * 0.34), ...(ring ? { boxShadow: `0 0 0 2px ${ring}, 0 0 10px ${ring}` } : {}) }} className="text-[var(--text-2)]" />
    </span>
  )
}

export { FrameOverlay } from "@/components/frame-overlay"
