/** A Steam avatar in a round picture. Avatar frames were taken out of the site (owner request 2026-11-01), so `frame` is accepted and ignored. */
import { PlayerAvatar } from "@/components/player-avatar"

/** `size` is the outer box in px, as before; the round picture sits in the middle of it at the size it had without a frame. */
export function FramedAvatar({ avatar, name, size }: { avatar?: string; name?: string; frame?: string | null | undefined; size: number }) {
  const inner = Math.round(size * 0.7)
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <PlayerAvatar avatar={avatar} name={name} style={{ width: inner, height: inner, fontSize: Math.round(inner * 0.4) }} className="text-[var(--text-2)]" />
    </span>
  )
}

export { FrameOverlay } from "@/components/frame-overlay"
