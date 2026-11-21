import { useEffect, useState } from "react"
import { Crosshair, Sparkles, Sword } from "lucide-react"

import { itemPicture } from "@/lib/item-picture"
import { cn } from "@/lib/utils"

export type ModelKindId = "model_knife" | "model_deagle" | "model_ak47"
export type ModelArtMode = "fill" | "big" | "preview" | "small"

/** The preview's picture: a change of model slides the new picture in and the old one out, so the two are never swapped with a jump. */
function SlidingPicture({ src }: { src: string }) {
  const [state, setState] = useState<{ shown: string; prev: string | null }>({ shown: src, prev: null })
  useEffect(() => {
    setState((current) => (current.shown === src ? current : { shown: src, prev: current.shown }))
    const timer = window.setTimeout(() => setState((current) => ({ ...current, prev: null })), 450)
    return () => window.clearTimeout(timer)
  }, [src])
  return (
    <div className="relative aspect-video w-full overflow-hidden">
      {state.prev && <img key={`out-${state.prev}`} src={state.prev} alt="" draggable={false} className="lx-model-out absolute inset-0 h-full w-full object-cover" />}
      <img key={state.shown} src={state.shown} alt="" width={640} height={360} draggable={false} className={cn("h-full w-full object-cover", state.prev && "lx-model-in")} />
    </div>
  )
}

/**
 * A weapon model, as it looks in the game's first person view, or, with no picture, the weapon it replaces drawn as an icon. The picture comes from the item itself (`item.image`, put there by staff).
 * `fill` covers its whole box (a tile), `big` is the hover card, `preview` the large one beside the price, `small` a thumbnail (an outfit row, the Appearance list).
 */
export function ModelArt({ item, kind, mode }: { item: { id: string; image?: string | null }; kind: ModelKindId; mode: ModelArtMode }) {
  const src = itemPicture(item)
  if (src) {
    // The big preview: when another model is picked, its picture slides in as the old one slides out and fades (owner request 2026-11-09, "the pictures move smoothly between each other").
    if (mode === "preview") return <SlidingPicture src={src} />
    const look = mode === "fill" ? "h-full w-full object-cover" : mode === "big" ? "aspect-video w-[320px] rounded-lg border border-[var(--line)] object-cover" : "aspect-video w-16 rounded-md object-cover"
    return <img src={src} alt="" width={640} height={360} loading="lazy" draggable={false} className={look} />
  }
  const big = mode === "big" || mode === "preview"
  const Icon = kind === "model_knife" ? Sword : Crosshair
  return (
    <span className="flex flex-col items-center gap-1.5 text-[var(--text-2)]">
      <Icon className={big ? "size-14" : "size-9"} strokeWidth={1.5} aria-hidden="true" />
      <span className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-dim)]">{kind === "model_knife" ? "Knife" : kind === "model_deagle" ? "Desert Eagle" : "AK-47"}</span>
    </span>
  )
}

/** The Apex models bring their own animations (inspect, draw, attack): they carry the "Animated" chip wherever their picture shows. */
export const isAnimatedModel = (item: { id: string }) => item.id.startsWith("apex-")

export function AnimatedChip({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center gap-1 rounded-full border border-white/25 bg-black/55 px-2 text-[10px] font-semibold uppercase tracking-[0.4px] text-white backdrop-blur-sm", className)}>
      <Sparkles className="size-3" aria-hidden="true" />Animated
    </span>
  )
}
