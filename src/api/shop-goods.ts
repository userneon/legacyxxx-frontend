import { get, post, put, type CallOptions } from "./client"

/** Real goods in the Shop (NFC charms, stickers). Nothing is paid here: the player asks, staff call them and take the payment. */
export interface GoodsProduct {
  id: string
  slug: string
  name: string
  description: string
  kind: "charm" | "sticker" | "other" | "lx" | "founder"
  /** Price in tugrik (MNT). */
  priceMnt: number
  imageUrl: string | null
  stock: number
  /** For kind "lx": the LX the package puts in the wallet once it is paid. */
  grantsLx: number
  /** For the Genesis pack: how many packs there are, how many are taken, when it stops selling, and whether it can still be ordered. */
  founder?: { limit: number; taken: number; remaining: number; endsAt: string | null; open: boolean }
}

export type GoodsOrderStatus = "new" | "contacted" | "paid" | "shipped" | "done" | "cancelled"

export interface GoodsOrder {
  id: string
  productId: string
  productName: string
  /** "lx" for a top-up package. */
  productKind: string
  /** LX the order puts in the wallet once paid; 0 for goods. */
  grantsLx: number
  quantity: number
  unitPriceMnt: number
  status: GoodsOrderStatus
  createdAt: string
}

/** Staff view: an order with the player's contact. */
export interface StaffGoodsOrder extends GoodsOrder {
  phone: string
  note: string
  player: { steamId: string; username: string }
}

/** Staff view: a product with whether it is shown in the shop. */
export interface StaffGoodsProduct extends GoodsProduct {
  enabled: boolean
  sort: number
}

export interface GoodsProductInput {
  name: string
  description: string
  kind: GoodsProduct["kind"]
  grantsLx: number
  priceMnt: number
  imageUrl: string | null
  stock: number
  enabled: boolean
  sort: number
  /** The Genesis pack only: when it stops selling (an ISO time; null = it never ends). Leave out for other products. */
  endsAt?: string | null
}

export const shopGoodsService = {
  async staffOrders(status: GoodsOrderStatus | undefined, options?: CallOptions): Promise<StaffGoodsOrder[]> {
    return (await get<{ orders: StaffGoodsOrder[] }>("/api/v1/staff/shop/orders", status ? { status } : undefined, options)).orders
  },
  async setOrderStatus(orderId: string, status: GoodsOrderStatus): Promise<void> {
    await put<unknown>(`/api/v1/staff/shop/orders/${orderId}`, { status })
  },
  async staffProducts(options?: CallOptions): Promise<StaffGoodsProduct[]> {
    return (await get<{ products: StaffGoodsProduct[] }>("/api/v1/staff/shop/products", undefined, options)).products
  },
  async saveProduct(slug: string, input: GoodsProductInput): Promise<void> {
    await put<unknown>(`/api/v1/staff/shop/products/${slug}`, input)
  },
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
