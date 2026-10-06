import { get, type CallOptions } from "./client"

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
}
