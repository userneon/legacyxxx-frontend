import { useSyncExternalStore } from "react"

/** Which part of Skinchanger is open. The sidebar's Skinchanger submenu sets it; the page shows it. */
export type SkinchangerView = "loadout" | "collections"

let current: SkinchangerView = "loadout"
const listeners = new Set<() => void>()

export function setSkinchangerView(next: SkinchangerView) {
  if (next === current) return
  current = next
  listeners.forEach((notify) => notify())
}

export function useSkinchangerView() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    () => current,
    () => "loadout" as const,
  )
}
