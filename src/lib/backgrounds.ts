import { createElement, lazy, Suspense, type ComponentType, type CSSProperties } from "react"

import { BACKGROUNDS, type BgControl, type BgDef } from "@/lib/backgrounds.generated"

export { BACKGROUNDS }
export type { BgControl, BgDef }

/** What a player saved for a background: only knob values (numbers, switches, colours, colour lists, option names), keyed by the knob. */
export type BgLook = Record<string, number | boolean | string | string[]>

const loaders = import.meta.glob<{ default: ComponentType<Record<string, unknown>> }>("../components/reactbits/bg/*.tsx")
const lazyScenes = new Map<string, ComponentType<Record<string, unknown>>>()

export const bgById = (id: string | null | undefined): BgDef | null => (id ? BACKGROUNDS.find((entry) => entry.id === id) ?? null : null)

const HEX = /^#[0-9a-fA-F]{3,8}$/

/** The knob values this background really accepts: anything unknown, mistyped or out of range is dropped (a saved look is data from the API, never trusted). */
export function cleanBgLook(def: BgDef, look: unknown): BgLook {
  const out: BgLook = {}
  if (!look || typeof look !== "object") return out
  const raw = look as Record<string, unknown>
  for (const control of def.controls) {
    const value = raw[control.key]
    if (value === undefined || value === null) continue
    if (control.type === "boolean" && typeof value === "boolean") out[control.key] = value
    else if (control.type === "number" && typeof value === "number" && Number.isFinite(value)) out[control.key] = Math.min(control.max, Math.max(control.min, value))
    else if (control.type === "color" && typeof value === "string" && HEX.test(value)) out[control.key] = value
    else if (control.type === "colors" && Array.isArray(value) && value.length >= 1 && value.length <= 8 && value.every((entry) => typeof entry === "string" && HEX.test(entry))) out[control.key] = value as string[]
    else if (control.type === "select" && typeof value === "string" && control.options.includes(value)) out[control.key] = value
  }
  return out
}

function sceneOf(def: BgDef): ComponentType<Record<string, unknown>> | null {
  const cached = lazyScenes.get(def.id)
  if (cached) return cached
  const load = loaders[`../components/reactbits/bg/${def.file}.tsx`]
  if (!load) return null
  const component = lazy(load)
  lazyScenes.set(def.id, component)
  return component
}

/** A background drawn by its React Bits component with the player's knob values (live WebGL: use it on one page at a time). */
export function BackgroundScene({ id, look, paused = false, className, style }: { id: string; look?: unknown; paused?: boolean; className?: string; style?: CSSProperties }) {
  const def = bgById(id)
  const Scene = def ? sceneOf(def) : null
  if (!def || !Scene) return null
  return createElement(Suspense, { fallback: null }, createElement(Scene, { ...cleanBgLook(def, look), paused, className, style }))
}
