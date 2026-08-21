import { get, post, type CallOptions } from "./client"
import type {
  ChargeRequest,
  WalletBalance,
  WalletTransaction,
} from "./types"

/**
 * Wallet service. Reads the current balance and transaction history, and
 * initiates a balance charge via the configured payment method.
 */
export const walletService = {
  async getBalance(options?: CallOptions): Promise<WalletBalance> {
    return get<WalletBalance>("/wallet/balance", undefined, options)
  },

  async getTransactions(options?: CallOptions): Promise<WalletTransaction[]> {
    return get<WalletTransaction[]>("/wallet/transactions", undefined, options)
  },

  async charge(payload: ChargeRequest, options?: CallOptions): Promise<WalletBalance> {
    return post<WalletBalance>("/wallet/charge", payload, options)
  },
}
