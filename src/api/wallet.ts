import { get, post, type CallOptions } from "./client"

/** The signed-in player's LX wallet (backend GET /wallet/me): the balance and the latest ledger lines. */
export interface WalletTransaction {
  id: string
  /** Positive when LX came in, negative when they were spent. */
  amount: number
  kind: string
  reason: string
  balanceAfter: number
  at: string
}

/** One way to earn LX, as the API lists it (the numbers live in one place, the backend). */
export interface EarnRule {
  id: string
  label: string
  coins: number
}

/** What the clan services cost (one source: the backend). */
export interface ClanPrices {
  create: number
  rename: number
  slots: number
  slotStep: number
  slotCap: number
}

/** The wallet page's numbers (backend `summary`). Null when the server could not work them out. */
export interface WalletSummary {
  todayEarned: number
  weekEarned: number
  todayMatches: number
  weekMatches: number
  spentTotal: number
  spentCount: number
  /** The last 14 days, oldest first. Days are Ulaanbaatar days as YYYY-MM-DD. */
  daily: Array<{ day: string; earned: number }>
  /** The last 7 days ending today, oldest first. */
  week: Array<{ day: string; played: boolean }>
  streakDays: number
}

export interface Wallet {
  balance: number
  transactions: WalletTransaction[]
  /** How LX is earned. Absent from an older API. */
  earn?: EarnRule[]
  /** Clan prices for the Shop. Absent from an older API. */
  clanPrices?: ClanPrices
  /** Numbers for the wallet page. Absent from an older API. */
  summary?: WalletSummary | null
}

export const walletService = {
  async getMine(options?: CallOptions): Promise<Wallet> {
    return get<Wallet>("/api/v1/wallet/me", undefined, options)
  },

  /** Owner only: give a player LX (backend POST /wallet/grant). */
  async grant(payload: { steamId: string; amount: number; reason: string }, options?: CallOptions): Promise<{ balance: number }> {
    return post<{ balance: number }>("/api/v1/wallet/grant", payload, options)
  },

  /** Owner only: take LX away as a penalty. A wallet never goes below zero, so `taken` can be less than asked. */
  async penalize(payload: { steamId: string; amount: number; reason: string }, options?: CallOptions): Promise<{ balance: number; taken: number }> {
    return post<{ balance: number; taken: number }>("/api/v1/wallet/penalty", payload, options)
  },
}
