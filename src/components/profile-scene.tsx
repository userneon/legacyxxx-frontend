import { useEffect, useState } from "react"

import type { ProfileSceneMedia } from "@/lib/profile-scene"

const FADE_MS = 600

/**
 * The player's Steam background across the whole window, behind the sidebar, top bar and panel. It fades in and out as a
 * profile opens and closes, and sits under a dark overlay so the text on top stays readable.
 */
export function ProfileScene({ scene }: { scene: ProfileSceneMedia | null }) {
  // The last scene stays mounted while it fades out.
  const [shown, setShown] = useState<ProfileSceneMedia | null>(scene)
  const [visible, setVisible] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)

  useEffect(() => {
    if (scene) {
      setShown(scene)
      setVideoFailed(false)
      const frame = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    const timer = window.setTimeout(() => setShown(null), FADE_MS)
    return () => window.clearTimeout(timer)
  }, [scene])

  if (!shown) return null
  const video = shown.video
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-[1] overflow-hidden bg-[var(--bg)] transition-opacity ease-out" style={{ opacity: visible ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}>
      {video && !videoFailed ? (
        <video className="absolute inset-0 size-full object-cover opacity-50" autoPlay muted loop playsInline poster={shown.still ?? undefined} onError={() => setVideoFailed(true)}>
          {video.webm && <source src={video.webm} type="video/webm" />}
          {video.mp4 && <source src={video.mp4} type="video/mp4" />}
        </video>
      ) : shown.still ? (
        <div className="absolute inset-0 bg-cover bg-center opacity-50" style={{ backgroundImage: `url("${shown.still}")` }} />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg)]/50 via-[var(--bg)]/65 to-[var(--bg)]/90" />
    </div>
  )
}
