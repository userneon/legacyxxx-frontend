import { del, get, post, put, type CallOptions } from "./client"

/** The Market (owner request 2026-11-07): players post what they like to sell, with photos, a price and their phone and email. */
export interface MarketSeller { id: string; name: string; avatar: string | null; steamId: string }
export interface MarketCard {
  id: string
  title: string
  priceMnt: number | null
  cover: string | null
  status: "active" | "sold" | "removed"
  createdAt: string
  seller: MarketSeller
  hidden?: boolean
  reportCount?: number
  expiresAt?: string
}
export interface MarketPage { items: MarketCard[]; total: number; page: number; pageSize: number }
export interface MarketImage { id: string; url: string }
export interface MarketListing extends MarketCard {
  description: string
  images: MarketImage[]
  hasPhone: boolean
  hasEmail: boolean
  expiresAt: string
  mine: boolean
  hidden: boolean
  reportCount?: number
  removedReason?: string | null
  /** Only for the owner: what they typed, to edit. */
  owner?: { phone: string; email: string }
}
export interface MarketInput { title: string; description: string; priceMnt?: number | null; phone?: string; email?: string }

/** What a picture may be: the same limits the server enforces (it re-encodes the picture to WebP, no wider than 1400 px, without camera or place data). */
export const MARKET_RULES = { maxImages: 6, maxBytes: 8 * 1024 * 1024, types: ["image/png", "image/jpeg", "image/gif", "image/webp"], titleMax: 80, descriptionMax: 2000, activeListings: 5 }

export function marketImageProblem(file: File): string | null {
  if (!MARKET_RULES.types.includes(file.type)) return "Use a PNG, JPEG, GIF or WebP picture."
  if (file.size > MARKET_RULES.maxBytes) return "The picture is larger than 8 MB."
  return null
}

export const marketService = {
  list: (query: { q?: string; page?: number }, options?: CallOptions) => get<MarketPage>("/api/v1/public/market", query, options),
  detail: (id: string, signedIn: boolean, options?: CallOptions) => get<MarketListing>(signedIn ? `/api/v1/market/${encodeURIComponent(id)}` : `/api/v1/public/market/${encodeURIComponent(id)}`, undefined, options),
  mine: (options?: CallOptions) => get<{ items: MarketCard[] }>("/api/v1/market/mine", undefined, options),
  reported: (options?: CallOptions) => get<{ items: MarketCard[] }>("/api/v1/market/reported", undefined, options),
  contact: (id: string, options?: CallOptions) => get<{ phone: string; email: string }>(`/api/v1/market/${encodeURIComponent(id)}/contact`, undefined, options),
  create: (input: MarketInput, options?: CallOptions) => post<{ id: string }>("/api/v1/market", input, options),
  update: (id: string, input: MarketInput, options?: CallOptions) => put<{ id: string }>(`/api/v1/market/${encodeURIComponent(id)}`, input, options),
  addImage: (id: string, file: Blob, options?: CallOptions) => post<MarketImage>(`/api/v1/market/${encodeURIComponent(id)}/images`, file, options),
  removeImage: (id: string, imageId: string, options?: CallOptions) => del<void>(`/api/v1/market/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`, options),
  setStatus: (id: string, status: "active" | "sold", options?: CallOptions) => post<{ id: string; status: string }>(`/api/v1/market/${encodeURIComponent(id)}/status`, { status }, options),
  remove: (id: string, reason?: string, options?: CallOptions) => del<void>(`/api/v1/market/${encodeURIComponent(id)}${reason ? `?reason=${encodeURIComponent(reason)}` : ""}`, options),
  restore: (id: string, options?: CallOptions) => post<{ id: string }>(`/api/v1/market/${encodeURIComponent(id)}/restore`, undefined, options),
  report: (id: string, reason: string, options?: CallOptions) => post<{ reported: boolean }>(`/api/v1/market/${encodeURIComponent(id)}/report`, { reason }, options),
}

/** "50,000₮", or "Ask" when the seller gave no price. */
export const formatPrice = (priceMnt: number | null | undefined) => (priceMnt === null || priceMnt === undefined ? "Ask" : priceMnt === 0 ? "Free" : `${priceMnt.toLocaleString("en-US")}₮`)
