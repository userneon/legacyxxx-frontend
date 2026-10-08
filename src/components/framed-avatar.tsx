/** Avatar frames (art in public/frames). The picture sits behind the art in a rounded square the size of the frame's opening. */
import { frameArt } from "@/lib/cosmetics"
import { PlayerAvatar } from "@/components/player-avatar"

/** A Steam avatar wearing a frame. `size` is the frame's outer box in px. */
export function FramedAvatar({ avatar, name, frame, size }: { avatar?: string; name?: string; frame: string | null | undefined; size: number }) {
  const art = frameArt(frame)
  const inner = Math.round(size * (art?.opening ?? 0.7))
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <PlayerAvatar avatar={avatar} name={name} className="text-xl" style={{ width: inner, height: inner, borderRadius: Math.round(inner * 0.26) }} />
      {art && <img src={art.src} alt="" aria-hidden="true" width={size} height={size} className="pointer-events-none absolute inset-0 size-full max-w-none select-none" draggable={false} />}
    </span>
  )
}

/**
 * The frame alone, drawn around an avatar the page already shows: it overflows the avatar's box (which must be `relative`)
 * and takes no space, so rows and cards keep their layout.
 */
export function FrameOverlay({ frame }: { frame: string | null | undefined }) {
  const art = frameArt(frame)
  if (!art) return null
  return <img src={art.src} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute left-1/2 top-1/2 z-10 max-w-none -translate-x-1/2 -translate-y-1/2 select-none" style={{ width: `${100 / art.opening}%`, height: `${100 / art.opening}%` }} />
}
