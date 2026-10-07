import { useSyncExternalStore } from "react"

/** The Steam background of the profile that is open. The page sets it; the app shell draws it behind everything. */
export interface ProfileSceneMedia {
  still: string | null
  video: { webm?: string | null; mp4?: string | null } | null
}

let current: ProfileSceneMedia | null = null
const listeners = new Set<() => void>()

export function setProfileScene(next: ProfileSceneMedia | null) {
  const same = (current?.still ?? null) === (next?.still ?? null) && (current?.video?.mp4 ?? null) === (next?.video?.mp4 ?? null) && (current?.video?.webm ?? null) === (next?.video?.webm ?? null)
  if (same) return
  current = next
  listeners.forEach((notify) => notify())
}

export function useProfileScene() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    () => current,
    () => null,
  )
}
