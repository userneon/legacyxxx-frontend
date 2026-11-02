import { useState } from "react"
import { bgById } from "@/lib/backgrounds"

/**
 * A background's picture for a Shop tile or a list: the still kept with the site (public/bg/<id>.jpg, one per background, drawn once with its default
 * settings), because a page of dozens of live canvases cannot be made and the copy made in the visitor's own browser came out blank on real screens.
 * A background without a picture shows its name on a quiet dark tile, never a broken image or a stand-in picture.
 */
export function BgThumb({ id, className = "w-full", fill = false }: { id: string; className?: string; fill?: boolean }) {
  const [missing, setMissing] = useState(false)
  return (
    <span className={`${fill ? "absolute inset-0" : "relative aspect-video rounded-lg"} flex items-center justify-center overflow-hidden bg-[var(--card-surface)] ${fill ? "" : className}`}>
      {missing
        ? <span className="px-2 text-center text-[11px] font-medium leading-tight text-[var(--text-dim)]">{bgById(id)?.name ?? ""}</span>
        : <img src={`/bg/${id}.jpg`} alt="" aria-hidden="true" draggable={false} decoding="async" onError={() => setMissing(true)} className="absolute inset-0 size-full object-cover" />}
    </span>
  )
}
