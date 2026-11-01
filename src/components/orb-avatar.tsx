import CrystalizedBall from "@/components/reactbits/crystalized-ball"
import { PlayerAvatar } from "@/components/player-avatar"
import { resolveLook, type FrameLook } from "@/lib/frame-look"

/**
 * A round avatar inside the Crystal Orb: the glass ball with its crackling rim and swirling dust drawn behind the picture, which sits
 * in the middle of it. `size` is the whole orb in px. Each orb is one WebGL canvas, so it is for the large places only (a profile,
 * the Shop preview); everywhere else a framed avatar is the plain round picture with a ring in the orb's colour (see FramedAvatar).
 */
export function OrbAvatar({ avatar, name, size, look, paused = false }: { avatar?: string; name?: string; size: number; look?: FrameLook | null; paused?: boolean }) {
  const resolved = resolveLook(look)
  const inner = Math.round(size * 0.6)
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 block">
        <CrystalizedBall size={0.98} {...resolved} theme="dark" paused={paused} />
      </span>
      <PlayerAvatar avatar={avatar} name={name} style={{ width: inner, height: inner, fontSize: Math.round(inner * 0.34) }} className="relative z-10 text-[var(--text-2)]" />
    </span>
  )
}
