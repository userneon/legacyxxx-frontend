/** Winter on the website (owner request 2026-11-09, "real snow, a winter / New Year look, many flakes, snow on the cards"). */

/** Months (1 = January) that count as winter in Mongolia: November to February. */
const WINTER_MONTHS = new Set([11, 12, 1, 2])

/** Winter by the Ulaanbaatar calendar (UTC+8, no daylight saving), whatever the visitor's own time zone is. */
export function isWinterSeason(now: Date = new Date()): boolean {
  const month = new Date(now.getTime() + 8 * 3_600_000).getUTCMonth() + 1
  return WINTER_MONTHS.has(month)
}

/** How many flakes a window of this size gets: plenty on a desktop, fewer on a phone, never more than the cap. */
export function flakeCount(width: number, height: number): number {
  return Math.round(Math.min(56, Math.max(16, (width * height) / 26000)))
}
