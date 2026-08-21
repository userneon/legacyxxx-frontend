import { get, post, type CallOptions } from "./client"
import type { ShopFilters, ShopItem } from "./types"

/**
 * Store service. Lists shop items (optionally filtered by category/rarity),
 * fetches a single item, and records a purchase against the wallet.
 */
export const storeService = {
  async getItems(filters?: ShopFilters, options?: CallOptions): Promise<ShopItem[]> {
    return get<ShopItem[]>(
      "/api/v1/store/items",
      { category: filters?.category, rarity: filters?.rarity },
      options,
    )
  },

  async getItem(itemId: string, options?: CallOptions): Promise<ShopItem> {
    return get<ShopItem>(`/api/v1/store/items/${itemId}`, undefined, options)
  },

  async purchaseItem(itemId: string, options?: CallOptions): Promise<void> {
    await post<void>(`/api/v1/store/items/${itemId}/purchase`, undefined, options)
  },
}