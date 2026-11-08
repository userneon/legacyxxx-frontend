import type { EventTheme } from "@/api/events"

/** What each holiday says on Home and what the staff form calls it. The look itself lives in `event-themes.css` (one block per theme). */
export const EVENT_THEMES: ReadonlyArray<{ id: EventTheme; label: string; greeting: string }> = [
  { id: "halloween", label: "Halloween", greeting: "Happy Halloween" },
  { id: "new-year", label: "New Year", greeting: "Happy New Year" },
  { id: "tsagaan-sar", label: "Tsagaan Sar", greeting: "Сар шинийн мэнд" },
]

export function eventGreeting(theme: EventTheme | null | undefined): string | null {
  return EVENT_THEMES.find((entry) => entry.id === theme)?.greeting ?? null
}

/** A theme the code knows; anything else from the API is ignored so an old site never draws a half-made look. */
export function knownEventTheme(value: unknown): EventTheme | null {
  return EVENT_THEMES.some((entry) => entry.id === value) ? (value as EventTheme) : null
}

/** "2026-10-25" and "2026-11-01" as "25 Oct to 1 Nov" (days as typed, no time zone maths). */
export function eventDays(startsOn: string, endsOn: string): string {
  const part = (day: string) => {
    const [, month, date] = day.split("-").map(Number)
    const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return `${date} ${names[(month ?? 1) - 1] ?? ""}`
  }
  return startsOn === endsOn ? part(startsOn) : `${part(startsOn)} to ${part(endsOn)}`
}
