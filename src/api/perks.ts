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
  /** A QA tester switches a rank on for free. */
  qaActivate: (tier: string) => post<{ grant: PerkGrant | null }>("/api/v1/perks/qa-activate", { tier }),
  saveCommands: (commands: string[]) => put<{ grant: PerkGrant }>("/api/v1/perks/me/commands", { commands }),
}

// The catalogue is kept for the session and asked again every time the Shop opens, so the Ranks show at once on a second visit and a slow answer never leaves a gap.
let remembered: PerkCatalogue | null = null
const STORAGE_KEY = "lx-perk-catalogue"

export function cachedPerkCatalogue(): PerkCatalogue | null {
  if (remembered) return remembered
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) remembered = JSON.parse(raw) as PerkCatalogue
  } catch { /* no storage: the page just asks */ }
  return remembered
}

export async function loadPerkCatalogue(options?: CallOptions): Promise<PerkCatalogue> {
  const fresh = await perksService.catalogue(options)
  remembered = fresh
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)) } catch { /* ignore */ }
  return fresh
}
