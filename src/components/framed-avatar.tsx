/** A Steam avatar in a round picture. Old avatar frames were taken out of the site (owner request 2026-11-01); the Crystal Orb is the one frame there is. */
import { FrozenOrb } from "@/components/frozen-orb"
import { OrbAvatar } from "@/components/orb-avatar"
import { PlayerAvatar } from "@/components/player-avatar"
import { RingFrame } from "@/components/ring-frame"
import { isRingFrame } from "@/lib/ring-frames"
import { ORB_ID, type FrameLook } from "@/lib/frame-look"

/**
 * `size` is the diameter in px. Wearing the Crystal Orb (`frame`) the avatar sits in the orb: a live one where `live` is set (a profile,
 * the Shop: each is a WebGL canvas, and a page may only hold so many), a still picture of it everywhere else. Any other `frame` is ignored.
 */
export function FramedAvatar({ avatar, name, size, frame, look, live = false }: { avatar?: string; name?: string; frame?: string | null | undefined; size: number; look?: FrameLook | null; live?: boolean }) {
  if (frame === ORB_ID && live) return <OrbAvatar avatar={avatar} name={name} size={size} look={look} />
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <PlayerAvatar avatar={avatar} name={name} style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }} className="text-[var(--text-2)]" />
      {frame === ORB_ID && <FrozenOrb look={look} />}
      {isRingFrame(frame) && <RingFrame id={frame} />}
    </span>
  )
}

export { FrameOverlay } from "@/components/frame-overlay"
