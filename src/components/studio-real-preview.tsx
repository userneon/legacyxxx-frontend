/**
 * "Real" preview of a craft: the ChainSkins 3D viewer (github.com/ChainSkins/cs2-3d-viewer, embed route) drawing the gun with the
 * game's own sticker and charm shaders. The craft is handed over as an inspect link in the address, so nothing is stored there.
 * The viewer always shows its chainskins.net mark (its embed terms); the models and textures are Valve's, served by that viewer.
 */
import { useEffect, useState } from "react"
import { inspectHex, type InspectCraft } from "@/lib/inspect-link"

export const REAL_VIEWER_ORIGIN = "https://3d.chainskins.net"

export function StudioRealPreview({ craft, label }: { craft: InspectCraft; label: string }) {
  const hex = inspectHex(craft)
  // The craft changes with every slider step; wait for it to settle so the viewer does not reload on each one.
  const [shown, setShown] = useState(hex)
  useEffect(() => {
    const timer = setTimeout(() => setShown(hex), 700)
    return () => clearTimeout(timer)
  }, [hex])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => setLoaded(false), [shown])
  return (
    <div className="absolute inset-0">
      <iframe
        key={shown}
        title={`${label} in the real 3D viewer`}
        src={`${REAL_VIEWER_ORIGIN}/embed?ui=0&auto_rotate=0&inspect=${shown}`}
        onLoad={() => setLoaded(true)}
        loading="lazy"
        referrerPolicy="no-referrer"
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin"
        className="size-full border-0"
      />
      {!loaded && <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] text-[var(--text-dim)]">Loading the real 3D view…</p>}
    </div>
  )
}
