/** Avatar frames (art in public/frames). The picture sits in front of the art, in a rounded square that fits the frame's inner border, so all of it shows. */
import { frameArt } from "@/lib/cosmetics"
import { PlayerAvatar } from "@/components/player-avatar"

/** A Steam avatar wearing a frame. `size` is the frame's outer box in px. */
export function FramedAvatar({ avatar, name, frame, size }: { avatar?: string; name?: string; frame: string | null | undefined; size: number }) {
  const art = frameArt(frame)
  const inner = Math.round(size * (art?.opening ?? 0.7))
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      {art && <img src={art.src} alt="" aria-hidden="true" width={size} height={size} className="pointer-events-none absolute inset-0 size-full max-w-none select-none" draggable={false} />}
      <PlayerAvatar avatar={avatar} name={name} className="relative z-10 text-xl" style={{ width: inner, height: inner, borderRadius: Math.round(inner * 0.26), translate: art ? `${art.dx * size}px ${art.dy * size}px` : undefined }} />
    </span>
  )
}

/**
 * The frame alone, drawn around an avatar the page already shows: it overflows the avatar's box (which must be `relative`)
 * and takes no space, so rows and cards keep their layout. The avatar (z-10) stays in front; here it is as large as the old opening, a little over the ornaments, which keeps small frames from growing.
 */
export function FrameOverlay({ frame }: { frame: string | null | undefined }) {
  const art = frameArt(frame)
  if (!art) return null
  return <img src={art.src} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute left-1/2 top-1/2 z-0 max-w-none select-none" style={{ width: `${100 / (art.opening / 0.82)}%`, height: `${100 / (art.opening / 0.82)}%`, translate: `${(-0.5 - art.dx) * 100}% ${(-0.5 - art.dy) * 100}%` }} />
}
