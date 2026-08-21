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
    return get<WalletBalance>("/api/v1/wallet/balance", undefined, options)
  },

  async getTransactions(options?: CallOptions): Promise<WalletTransaction[]> {
    return get<WalletTransaction[]>("/api/v1/wallet/transactions", undefined, options)
  },

  async charge(payload: ChargeRequest, options?: CallOptions): Promise<WalletBalance> {
    return post<WalletBalance>("/api/v1/wallet/charge", payload, options)
  },
}
