/** A Steam avatar in a round picture, with the ring frame the player wears (if any). Old avatar frames and the Crystal Orb were taken out of the site (owner request 2026-11-16). */
import { PlayerAvatar } from "@/components/player-avatar"
import { RingFrame } from "@/components/ring-frame"
import { isRingFrame } from "@/lib/ring-frames"

/** `size` is the diameter in px. */
export function FramedAvatar({ avatar, name, size, frame }: { avatar?: string; name?: string; frame?: string | null | undefined; size: number }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <PlayerAvatar avatar={avatar} name={name} style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }} className="text-[var(--text-2)]" />
      {isRingFrame(frame) && <RingFrame id={frame} />}
    </span>
  )
}

export { FrameOverlay } from "@/components/frame-overlay"
