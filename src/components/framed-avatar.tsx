/** Avatar frames (art in public/frames). The picture fills the frame's opening and its edges tuck under the art. */
import { frameArt } from "@/lib/cosmetics"
import { PlayerAvatar } from "@/components/player-avatar"

/** A Steam avatar wearing a frame. `size` is the frame's outer box in px. */
export function FramedAvatar({ avatar, name, frame, size }: { avatar?: string; name?: string; frame: string | null | undefined; size: number }) {
  const art = frameArt(frame)
  const inner = Math.round(size * (art?.opening ?? 0.7))
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <PlayerAvatar avatar={avatar} name={name} className="relative z-0" style={{ width: inner, height: inner, fontSize: Math.round(inner * 0.4), background: avatar ? undefined : "linear-gradient(135deg, var(--line-strong), var(--raised))", color: "var(--text-2)", borderRadius: Math.round(inner * 0.16), translate: art ? `${art.dx * size}px ${art.dy * size}px` : undefined }} />
      {art && <img src={art.src} alt="" aria-hidden="true" width={size} height={size} className="pointer-events-none absolute inset-0 z-10 size-full max-w-none select-none" draggable={false} />}
    </span>
  )
}

export { FrameOverlay } from "@/components/frame-overlay"
