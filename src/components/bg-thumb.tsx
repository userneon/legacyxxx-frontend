import { useEffect, useState } from "react"
import { Image as ImageIcon } from "lucide-react"

import { bgSnapshot, bgSnapshotNow } from "@/lib/bg-snapshot"

/** A background's picture for a Shop tile: made once in the background of the page (a grey tile with an icon until it is ready). */
export function BgThumb({ id, look, className }: { id: string; look?: unknown; className?: string }) {
  const [url, setUrl] = useState<string | null>(() => bgSnapshotNow(id, look))
  useEffect(() => {
    let live = true
    const known = bgSnapshotNow(id, look)
    if (known) setUrl(known)
    else bgSnapshot(id, look).then((made) => { if (live) setUrl(made) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  return (
    <span className={`relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-[var(--card-surface)] ${className ?? ""}`}>
      {url ? <img src={url} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 size-full object-cover" /> : <ImageIcon className="size-5 text-[var(--text-faint)]" aria-hidden="true" />}
    </span>
  )
}
