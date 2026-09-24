/** Number, time and duration formatting shared by the pages. */
import { getWebsitePrefs } from "@/lib/website-prefs"

const integer = new Intl.NumberFormat("en-US")

export function formatInt(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? "—" : integer.format(Math.round(value))
}

/** 0.5423 → "54%"; `digits` for one decimal. */
export function formatPercent(ratio: number | null | undefined, digits = 0): string {
  return ratio == null || !Number.isFinite(ratio) ? "—" : `${(ratio * 100).toFixed(digits)}%`
}

export function formatRatio(value: number | null | undefined, digits = 2): string {
  return value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits)
}

/** Signed EXP change: "+18", "−12", "0". */
export function formatSigned(value: number): string {
  if (value > 0) return `+${formatInt(value)}`
  if (value < 0) return `−${formatInt(Math.abs(value))}`
  return "0"
}

/** Time of day honoring Settings → Website → Time format. */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: getWebsitePrefs().timeFormat === "12h" })
}

export function formatDate(value: string | Date | null | undefined, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  if (!value) return "—"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", options)
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—"
  return `${formatDate(value)}, ${formatTime(value)}`
}

/** Milliseconds → "3d 4h", "4h 12m", "12m", "45s". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0m"
  const minutes = Math.floor(ms / 60_000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  if (mins > 0) return `${mins}m`
  return `${Math.max(1, Math.floor(ms / 1000))}s`
}
