import { useSyncExternalStore } from "react"

/**
 * Website preferences, saved per device (localStorage) and applied instantly.
 */
export type TimeFormat = "24h" | "12h"

export interface WebsitePreferences {
  killFeed: boolean
  sidebarCollapsed: boolean
  timeFormat: TimeFormat
}

export const WEBSITE_PREFS_KEY = "legacyx.website-prefs"
const DEFAULTS: WebsitePreferences = { killFeed: true, sidebarCollapsed: false, timeFormat: "24h" }

function read(): WebsitePreferences {
  try {
    const raw = window.localStorage.getItem(WEBSITE_PREFS_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<WebsitePreferences>
    return {
      killFeed: typeof parsed.killFeed === "boolean" ? parsed.killFeed : DEFAULTS.killFeed,
      sidebarCollapsed: typeof parsed.sidebarCollapsed === "boolean" ? parsed.sidebarCollapsed : DEFAULTS.sidebarCollapsed,
      timeFormat: parsed.timeFormat === "12h" ? "12h" : "24h",
    }
  } catch {
    return DEFAULTS
  }
}

let current: WebsitePreferences = typeof window === "undefined" ? DEFAULTS : read()
const listeners = new Set<() => void>()

export function getWebsitePreferences() {
  return current
}

export function setWebsitePreference<K extends keyof WebsitePreferences>(key: K, value: WebsitePreferences[K]) {
  current = { ...current, [key]: value }
  try {
    window.localStorage.setItem(WEBSITE_PREFS_KEY, JSON.stringify(current))
  } catch {
    // Private mode / blocked storage: the choice still applies for this visit.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== WEBSITE_PREFS_KEY) return
    current = read()
    listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

export function useWebsitePreferences(): WebsitePreferences {
  return useSyncExternalStore(subscribe, getWebsitePreferences, () => DEFAULTS)
}

/** Clock time in the chosen 24h/12h format. */
export function formatClock(value: string | number | Date, format: TimeFormat = current.timeFormat) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return "—"
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: format === "12h" })
}

/** "Sat 27 Sep, 19:00" (or 7:00 pm with 12h). */
export function formatDateTime(value: string | number | Date, format: TimeFormat = current.timeFormat) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return "—"
  const day = date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
  return `${day}, ${formatClock(date, format)}`
}

export function formatDate(value: string | number | Date) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}
