/**
 * Settings → Website preferences. Saved per device in localStorage, applied instantly, and read on boot before
 * first paint (index.html applies `motion`). Every read/write tolerates unavailable storage.
 */
import { useSyncExternalStore } from "react"

export type MotionPreference = "system" | "reduce" | "full"
export type TimeFormat = "24h" | "12h"

export interface WebsitePrefs {
  killFeed: boolean
  sidebarCollapsed: boolean
  motion: MotionPreference
  timeFormat: TimeFormat
}

const KEY = "legacyx:website"
const DEFAULTS: WebsitePrefs = { killFeed: true, sidebarCollapsed: false, motion: "system", timeFormat: "24h" }
const listeners = new Set<() => void>()

function read(): WebsitePrefs {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<WebsitePrefs>
    return {
      killFeed: typeof parsed.killFeed === "boolean" ? parsed.killFeed : DEFAULTS.killFeed,
      sidebarCollapsed: typeof parsed.sidebarCollapsed === "boolean" ? parsed.sidebarCollapsed : DEFAULTS.sidebarCollapsed,
      motion: parsed.motion === "reduce" || parsed.motion === "full" ? parsed.motion : "system",
      timeFormat: parsed.timeFormat === "12h" ? "12h" : "24h",
    }
  } catch {
    return DEFAULTS
  }
}

let snapshot = read()

export function getWebsitePrefs(): WebsitePrefs {
  return snapshot
}

export function setWebsitePrefs(patch: Partial<WebsitePrefs>) {
  snapshot = { ...snapshot, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot))
  } catch {
    /* Storage unavailable: the preference still applies for this visit. */
  }
  applyMotion(snapshot.motion)
  listeners.forEach((notify) => notify())
}

function applyMotion(motion: MotionPreference) {
  if (motion === "system") delete document.documentElement.dataset.motion
  else document.documentElement.dataset.motion = motion
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      snapshot = read()
      listener()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

export function useWebsitePrefs(): WebsitePrefs {
  return useSyncExternalStore(subscribe, getWebsitePrefs, getWebsitePrefs)
}

/** True when animations should be avoided (Settings → Reduce, or the OS setting under "System"). */
export function prefersReducedMotion(): boolean {
  if (snapshot.motion === "reduce") return true
  if (snapshot.motion === "full") return false
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}
