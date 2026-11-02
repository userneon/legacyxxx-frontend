/**
 * The Shop's plain rules, apart from the page so they can be tested: what a rarity looks like, what is about to run out, what an outfit costs.
 * No data is made up here: every function only works on what the API sent.
 */

/** Cosmetic rarity 1 to 4 on the site's own ladder (the same names and colours as the map cards, a thin line only). */
const RARITIES = [
  { label: "Standard", color: "var(--line-strong)" },
  { label: "Select", color: "var(--tone-green)" },
  { label: "Elite", color: "var(--tone-sky)" },
  { label: "Prime", color: "var(--tone-violet)" },
] as const

export function rarityOf(rarity: number | null | undefined) {
  const index = Math.min(RARITIES.length, Math.max(1, Math.round(rarity ?? 1))) - 1
  return RARITIES[index]
}

const DAY = 24 * 60 * 60 * 1000

/** Whole days left until `expiresAt`, or null when there is no end (yours for good) or the date is not readable. A date already past gives 0. */
export function daysLeft(expiresAt: string | null | undefined, now = Date.now()): number | null {
  if (!expiresAt) return null
  const end = Date.parse(expiresAt)
  if (Number.isNaN(end)) return null
  return Math.max(0, Math.ceil((end - now) / DAY))
}

/** Owned items that run out within `withinDays`, soonest first. */
export function endingSoon<T extends { owned?: boolean; expiresAt?: string | null }>(items: T[], withinDays = 7, now = Date.now()): T[] {
  return items
    .filter((item) => item.owned && daysLeft(item.expiresAt, now) !== null && (daysLeft(item.expiresAt, now) as number) <= withinDays)
    .sort((a, b) => Date.parse(a.expiresAt as string) - Date.parse(b.expiresAt as string))
}

/** What an outfit costs: the price of each item that is not owned yet, and what is left of the balance afterwards (null when the balance is not known). */
export function outfitTotal(items: Array<{ owned?: boolean; price: number }>, balance: number | null) {
  const total = items.filter((item) => !item.owned).reduce((sum, item) => sum + item.price, 0)
  return { total, left: balance === null ? null : balance - total, affordable: balance === null || balance >= total }
}

/** Saved items are kept in this browser only (a convenience, not an account fact). */
export const SAVED_KEY = "legacyx_shop_saved"

export function readSaved(storage: Pick<Storage, "getItem"> | null): string[] {
  try {
    const raw = storage?.getItem(SAVED_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(0, 200) : []
  } catch {
    return []
  }
}
