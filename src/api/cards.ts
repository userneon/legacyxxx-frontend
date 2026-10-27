import { get, post, type CallOptions } from "./client"

/** Collectible cards (backend /cards): one per CS2 map, own rarity ladder, unlimited supply, a price that follows how many copies are held. */
export type CardRarity = "standard" | "select" | "elite" | "prime" | "apex"

export interface TradingCardData {
  id: string
  name: string
  /** The map whose artwork the card shows, e.g. `de_mirage`. */
  mapKey: string
  rarity: CardRarity
  enabled: boolean
  /** Copies players hold in all. */
  held: number
  /** What the next copy costs now. */
  price: number
  /** What selling one of the viewer's copies pays now. */
  sellPrice: number
  /** How many copies the viewer (or the profile's player) holds. */
  qty: number
}

export interface CardTradeResult { price: number; held: number; qty: number; balance: number }

export const cardsService = {
  list: (options?: CallOptions) => get<{ cards: TradingCardData[]; sellShare: number }>("/api/v1/cards", undefined, options),
  ofPlayer: (userId: string, options?: CallOptions) => get<{ cards: TradingCardData[] }>(`/api/v1/profile/${encodeURIComponent(userId)}/cards`, undefined, options),
  /** `limit` is the price the player saw: a buy refuses to cost more, a sell refuses to pay less. */
  buy: (id: string, limit: number, options?: CallOptions) => post<CardTradeResult>(`/api/v1/cards/${encodeURIComponent(id)}/buy`, { limit }, options),
  sell: (id: string, limit: number, options?: CallOptions) => post<CardTradeResult>(`/api/v1/cards/${encodeURIComponent(id)}/sell`, { limit }, options),
}
