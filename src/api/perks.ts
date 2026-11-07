import { get, post, put, type CallOptions } from "./client"

/** The paid in-game ranks the Shop sells (backend `/public/perks`, `/perks/*`): three tiers for 14, 30 or 90 days, paid through Wire (QPay). */
export type PerkDays = 14 | 30 | 90
export interface PerkTierInfo { key: string; name: string; quota: number; prices: Record<string, number | null> }
export interface PerkCommand { name: string; group: string; summary: string }
export interface PerkCatalogue { available: boolean; days: PerkDays[]; modes: string[]; tiers: PerkTierInfo[]; pool: PerkCommand[] }
export interface PerkGrant { tier: string; name: string; quota: number; endsAt: string; commands: string[]; locked: boolean }
export interface PerkOrder { id: string; tier: string; days: number; amountMnt: number; status: "pending" | "paid" | "expired" | "failed"; createdAt: string; paidAt: string | null }
export interface PerkInvoice extends PerkOrder { name: string; checkoutUrl: string; expiresInMinutes: number }
export interface PerkMine { grant: PerkGrant | null; pending: (PerkOrder & { checkoutUrl: string }) | null }

export const perksService = {
  catalogue: (options?: CallOptions) => get<PerkCatalogue>("/api/v1/public/perks", undefined, options),
  mine: (options?: CallOptions) => get<PerkMine>("/api/v1/perks/me", undefined, options),
  checkout: (tier: string, days: PerkDays) => post<PerkInvoice>("/api/v1/perks/checkout", { tier, days }),
  order: (id: string, options?: CallOptions) => get<PerkOrder>(`/api/v1/perks/orders/${encodeURIComponent(id)}`, undefined, options),
  saveCommands: (commands: string[]) => put<{ grant: PerkGrant }>("/api/v1/perks/me/commands", { commands }),
}
