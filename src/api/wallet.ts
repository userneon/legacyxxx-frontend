import { get, post, type CallOptions } from "./client"
import type {
  ChargeRequest,
  PromotionHistoryItem,
  PromotionQuote,
  PromotionRedemption,
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

  async previewPromotion(payload: { code: string; context: "wallet_topup" | "wallet_redeem"; coinAmount?: number }, options?: CallOptions): Promise<PromotionQuote> {
    return post<PromotionQuote>("/api/v1/wallet/promo/preview", payload, options)
  },

  async redeemPromotion(payload: { code: string; idempotencyKey?: string }, options?: CallOptions): Promise<PromotionRedemption> {
    return post<PromotionRedemption>("/api/v1/wallet/promo/redeem", payload, options)
  },

  async getPromotionHistory(options?: CallOptions): Promise<PromotionHistoryItem[]> {
    return get<PromotionHistoryItem[]>("/api/v1/wallet/promotions", undefined, options)
  },
}
