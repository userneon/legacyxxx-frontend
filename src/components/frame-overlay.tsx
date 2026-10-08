import { frameArt } from "@/lib/cosmetics"

/**
 * The frame alone, drawn around an avatar the page already shows: it overflows the avatar's box (which must be `relative`)
 * and takes no space, so rows and cards keep their layout. The avatar fills the opening, as in FramedAvatar.
 */
export function FrameOverlay({ frame }: { frame: string | null | undefined }) {
  const art = frameArt(frame)
  if (!art) return null
  return <img src={art.src} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute left-1/2 top-1/2 z-10 max-w-none select-none" style={{ width: `${100 / art.opening}%`, height: `${100 / art.opening}%`, translate: `${(-0.5 - art.dx) * 100}% ${(-0.5 - art.dy) * 100}%` }} />
}
