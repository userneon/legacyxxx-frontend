import { useEffect, useState } from "react"

import type { FrameLook } from "@/lib/frame-look"
import { orbKey, orbSnapshot, orbSnapshotNow } from "@/lib/orb-snapshot"

/** The orb's own diameter against the avatar's: the avatar fills 92% of it. */
export const ORB_OVERFLOW = 1 / 0.92

/** A still orb drawn over a picture the page already shows: it overflows the box (which must be `relative`) and takes no room. */
export function FrozenOrb({ look }: { look?: FrameLook | null }) {
  const key = orbKey(look)
  const [url, setUrl] = useState<string | null>(() => orbSnapshotNow(look))
  useEffect(() => {
    let live = true
    const known = orbSnapshotNow(look)
    if (known) setUrl(known)
    else orbSnapshot(look).then((made) => { if (live) setUrl(made) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  if (!url) return null
  return <img src={url} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute left-1/2 top-1/2 z-10 max-w-none -translate-x-1/2 -translate-y-1/2 select-none" style={{ width: `${ORB_OVERFLOW * 100}%`, height: `${ORB_OVERFLOW * 100}%` }} />
}
