import { useState } from "react"
import { Image as ImageIcon } from "lucide-react"

/**
 * A background's picture for a Shop tile or a list: the still kept with the site (public/bg/<id>.jpg, one per background, drawn once with its default
 * settings), because a page of dozens of live canvases cannot be made and the copy made in the visitor's own browser came out blank on real screens.
 * A background without a picture shows a quiet icon.
 */
export function BgThumb({ id, className }: { id: string; className?: string }) {
  const [missing, setMissing] = useState(false)
  return (
    <span className={`relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-[var(--card-surface)] ${className ?? ""}`}>
      {missing
        ? <ImageIcon className="size-5 text-[var(--text-faint)]" aria-hidden="true" />
        : <img src={`/bg/${id}.jpg`} alt="" aria-hidden="true" draggable={false} loading="lazy" onError={() => setMissing(true)} className="absolute inset-0 size-full object-cover" />}
    </span>
  )
}
