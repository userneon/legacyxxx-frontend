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

/** A top-up: what the player pays and gets, and where it stands (backend POST /wallet/topup). */
export interface TopUp {
  id: string
  productId: string
  amountMnt: number
  grantsLx: number
  status: "pending" | "paid" | "expired" | "failed"
  createdAt: string
  paidAt: string | null
}
export interface TopUpInvoice extends TopUp {
  name: string
  /** Wire's own payment page (https), where the player pays with QPay or a bank app. */
  checkoutUrl: string
  expiresInMinutes: number
}

export interface TopUpAvailability {
  available: boolean
  /** The range for a top-up of any amount, from the API. */
  custom?: { minMnt: number; maxMnt: number; stepMnt: number }
}

export const walletService = {
  /** Whether the site can take QPay payments right now (the merchant is set up). */
  async topUpAvailable(options?: CallOptions): Promise<TopUpAvailability> {
    return get<TopUpAvailability>("/api/v1/wallet/topup/status", undefined, options)
  },
  /** A package (`productId`) or any amount in tugrik (`amountMnt`, at the smallest package's rate). */
  async startTopUp(input: { productId: string } | { amountMnt: number }): Promise<TopUpInvoice> {
    return post<TopUpInvoice>("/api/v1/wallet/topup", input)
  },
  /** Asks QPay about the invoice; the LX are added by the server the moment it is paid. */
  async topUp(id: string, options?: CallOptions): Promise<TopUp> {
    return get<TopUp>(`/api/v1/wallet/topup/${id}`, undefined, options)
  },
  async myTopUps(options?: CallOptions): Promise<TopUp[]> {
    return (await get<{ topups: TopUp[] }>("/api/v1/wallet/topups", undefined, options)).topups
  },

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
