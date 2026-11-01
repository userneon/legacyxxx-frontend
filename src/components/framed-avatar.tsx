/** A Steam avatar in a round picture. Avatar frames were taken out of the site (owner request 2026-11-01), so `frame` is accepted and ignored. */
import { PlayerAvatar } from "@/components/player-avatar"

/** `size` is the diameter in px: the round picture fills it (no room is left for a frame any more). */
export function FramedAvatar({ avatar, name, size }: { avatar?: string; name?: string; frame?: string | null | undefined; size: number }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <PlayerAvatar avatar={avatar} name={name} style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }} className="text-[var(--text-2)]" />
    </span>
  )
}

export { FrameOverlay } from "@/components/frame-overlay"
