/** A Steam avatar wearing an avatar frame. `size` is the frame's outer box in px; the picture sits inside its opening. */
import { frameArt } from "@/lib/cosmetics"
import { PlayerAvatar } from "@/components/player-avatar"

export function FramedAvatar({ avatar, name, frame, size }: { avatar?: string; name?: string; frame: string | null | undefined; size: number }) {
  const art = frameArt(frame)
  const inner = Math.round(size * (art?.opening ?? 0.7))
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <PlayerAvatar avatar={avatar} name={name} className="rounded-full text-xl" style={{ width: inner, height: inner }} />
      {art && <img src={art.src} alt="" aria-hidden="true" width={size} height={size} className="pointer-events-none absolute inset-0 size-full max-w-none select-none" draggable={false} />}
    </span>
  )
}
