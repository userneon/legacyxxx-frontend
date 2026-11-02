import CrystalizedBall from "@/components/reactbits/crystalized-ball"
import { PlayerAvatar } from "@/components/player-avatar"
import { ORB_AVATAR, ORB_BALL, resolveLook, type FrameLook } from "@/lib/frame-look"

/**
 * A round avatar inside the Crystal Orb: the picture sits in the middle and the glass ball, with its crackling rim and swirling dust,
 * is drawn over it (owner request 2026-11-01), so the picture is seen through the glass. `size` is the whole orb in px. Each orb is one WebGL canvas, so it is for the large places only (a profile,
 * the Shop preview); everywhere else a framed avatar is the plain round picture with a ring in the orb's colour (see FramedAvatar).
 */
export function OrbAvatar({ avatar, name, size, look, paused = false }: { avatar?: string; name?: string; size: number; look?: FrameLook | null; paused?: boolean }) {
  const resolved = resolveLook(look)
  const inner = Math.round(size * ORB_AVATAR)
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 block">
        <CrystalizedBall size={ORB_BALL} {...resolved} theme="dark" paused={paused} />
      </span>
      <PlayerAvatar avatar={avatar} name={name} style={{ width: inner, height: inner, fontSize: Math.round(inner * 0.34) }} className="relative z-0 text-[var(--text-2)]" />
    </span>
  )
}
