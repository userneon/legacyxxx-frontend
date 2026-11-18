import { useSyncExternalStore } from "react"

/**
 * Which side the Skinchanger is showing (T or CT). The page tells it here, and the picture behind the page reads it, so the agent behind the page changes with the side
 * (owner request 2026-11-18). It is T again when the page is left.
 */
export type SkinTeam = "t" | "ct"
let team: SkinTeam = "t"
const listeners = new Set<() => void>()

export function setSkinTeam(next: SkinTeam) {
  if (next === team) return
  team = next
  listeners.forEach((listener) => listener())
}

export function useSkinTeam(): SkinTeam {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => team, () => "t")
}
