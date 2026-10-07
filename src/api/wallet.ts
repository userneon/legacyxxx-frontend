import { get, post, type CallOptions } from "./client"

/** The signed-in player's coin wallet (backend GET /wallet/me): the balance and the latest ledger lines. */
export interface WalletTransaction {
  id: string
  /** Positive when coins came in, negative when they were spent. */
  amount: number
  kind: string
  reason: string
  balanceAfter: number
  at: string
}

export interface Wallet {
  balance: number
  transactions: WalletTransaction[]
}

export const walletService = {
  async getMine(options?: CallOptions): Promise<Wallet> {
    return get<Wallet>("/api/v1/wallet/me", undefined, options)
  },

  /** Owner only: give a player coins (backend POST /wallet/grant). */
  async grant(payload: { steamId: string; amount: number; reason: string }, options?: CallOptions): Promise<{ balance: number }> {
    return post<{ balance: number }>("/api/v1/wallet/grant", payload, options)
  },

  /** Owner only: take coins away as a penalty. A wallet never goes below zero, so `taken` can be less than asked. */
  async penalize(payload: { steamId: string; amount: number; reason: string }, options?: CallOptions): Promise<{ balance: number; taken: number }> {
    return post<{ balance: number; taken: number }>("/api/v1/wallet/penalty", payload, options)
  },
}
