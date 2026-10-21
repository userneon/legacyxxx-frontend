import { get, post, type CallOptions } from "./client"

/** Real goods in the Shop (NFC charms, stickers). Nothing is paid here: the player asks, staff call them and take the payment. */
export interface GoodsProduct {
  id: string
  slug: string
  name: string
  description: string
  kind: "charm" | "sticker" | "other"
  /** Price in tugrik (MNT). */
  priceMnt: number
  imageUrl: string | null
  stock: number
}

export type GoodsOrderStatus = "new" | "contacted" | "paid" | "shipped" | "done" | "cancelled"

export interface GoodsOrder {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPriceMnt: number
  status: GoodsOrderStatus
  createdAt: string
}

export const shopGoodsService = {
  async products(options?: CallOptions): Promise<GoodsProduct[]> {
    return (await get<{ products: GoodsProduct[] }>("/api/v1/shop/products", undefined, options)).products
  },
  async myOrders(options?: CallOptions): Promise<GoodsOrder[]> {
    return (await get<{ orders: GoodsOrder[] }>("/api/v1/shop/orders/me", undefined, options)).orders
  },
  async order(input: { productId: string; quantity: number; phone: string; note: string }): Promise<GoodsOrder> {
    return post<GoodsOrder>("/api/v1/shop/orders", input)
  },
}
