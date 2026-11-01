/** Avatar frames (art in public/frames). The picture fills the frame's opening and its edges tuck under the art. */
import { useEffect, useRef, useState } from "react"

import { frameArt, frameGlow } from "@/lib/cosmetics"
import { PlayerAvatar } from "@/components/player-avatar"

/** A Steam avatar wearing a frame. `size` is the frame's outer box in px. */
export function FramedAvatar({ avatar, name, frame, size }: { avatar?: string; name?: string; frame: string | null | undefined; size: number }) {
  const art = frameArt(frame)
  // The frame's picture can fail to arrive (a busy page asks for dozens at once): it is asked for again twice, and until it is here the
  // avatar is shown whole and uncut, never in the shape of a frame that is not drawn.
  const [tries, setTries] = useState(0)
  const [ready, setReady] = useState(false)
  useEffect(() => { setTries(0); setReady(false) }, [frame])
  const retryTimer = useRef<number | null>(null)
  useEffect(() => () => { if (retryTimer.current !== null) window.clearTimeout(retryTimer.current) }, [])
  const inner = Math.round(size * (art?.opening ?? 0.7))
  // A frame with a mask: the picture covers the whole box and is cut to the shape of the frame's opening.
  const masked = art?.maskSrc && ready
    ? { width: size, height: size, fontSize: Math.round(size * 0.3), borderRadius: 0, WebkitMaskImage: `url(${art.maskSrc})`, maskImage: `url(${art.maskSrc})`, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" }
    : null
  // With the opening's box known, the avatar is fitted to that box (the whole picture, only the edges of its longer side tuck under the art) and the mask only rounds its corners.
  const fitted = ready && art?.maskSrc && art.box ? art.box : null
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      {fitted && masked ? (
        <span aria-hidden="true" className="absolute inset-0 z-0" style={{ WebkitMaskImage: masked.WebkitMaskImage, maskImage: masked.maskImage, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" }}>
          <PlayerAvatar avatar={avatar} name={name} className="absolute" style={{ left: fitted[0] * size, top: fitted[1] * size, width: fitted[2] * size, height: fitted[3] * size, fontSize: Math.round(size * 0.22), borderRadius: 0 }} />
        </span>
      ) : (
      <PlayerAvatar avatar={avatar} name={name} className="relative z-0" style={masked ?? { width: inner, height: inner, fontSize: Math.round(inner * 0.4), background: avatar ? undefined : "linear-gradient(135deg, var(--line-strong), var(--raised))", color: "var(--text-2)", borderRadius: Math.round(inner * 0.16), translate: art ? `${art.dx * size}px ${art.dy * size}px` : undefined }} />
      )}
      {art && <img key={tries} src={tries === 0 ? art.src : `${art.src}&r=${tries}`} alt="" aria-hidden="true" width={size} height={size} className="pointer-events-none absolute inset-0 z-10 size-full max-w-none select-none" style={{ filter: frameGlow(frame), opacity: ready ? 1 : 0 }} draggable={false} onLoad={() => setReady(true)} onError={() => { if (tries < 2) retryTimer.current = window.setTimeout(() => setTries((count) => count + 1), 1200 * (tries + 1)) }} />}
    </span>
  )
}

export { FrameOverlay } from "@/components/frame-overlay"
