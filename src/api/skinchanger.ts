import { get, post, put, type CallOptions } from "./client"

export type SkinchangerCategory = "weapon" | "weapon_skin" | "knife" | "glove" | "agent" | "music_kit" | "pin" | "sticker" | "charm"
export type SkinchangerSlot = "weapon" | "knife" | "glove" | "agent" | "music_kit" | "pin"
export type TeamScope = "all" | "t" | "ct"
export type SkinchangerFirearmGroup = "Rifles" | "Mid Tier" | "Pistols"

export interface SkinchangerStickerOption { catalogItemId: string; id?: number; slot: number; schema?: number; offsetX?: number; offsetY?: number; wear?: number; scale?: number; rotation?: number }
export interface SkinchangerCharmOption { catalogItemId: string; id?: number; offsetX?: number; offsetY?: number; offsetZ?: number; seed?: number }
export interface SkinchangerAppearanceOptions { wear?: number; seed?: number; statTrak?: boolean; nameTag?: string; stickers?: SkinchangerStickerOption[]; charm?: SkinchangerCharmOption }
export interface SkinchangerCatalogItem { id: string; external_key: string; category: SkinchangerCategory; weapon_class: string | null; display_name: string; weapon_defindex: number | null; paint_id: number | null; model: string | null; image_key: string | null; image_url: string | null; metadata: Record<string, unknown> }
export interface SkinchangerCatalogPage { data: SkinchangerCatalogItem[]; pagination: { limit: number; offset: number; total: number } }
export interface SkinchangerCatalogFacets { categories: Array<{ category: SkinchangerCategory; count: number }>; weaponClasses: Array<{ weaponClass: string; count: number }> }
export interface SkinchangerLoadoutEntry { catalog_item_id: string; slot: SkinchangerSlot; slot_key: string; team_scope: TeamScope; options: SkinchangerAppearanceOptions; skinchanger_catalog_items: SkinchangerCatalogItem | null; resolved_accessories?: SkinchangerCatalogItem[] }
export interface SkinchangerLoadout { version: number; updated_at: string | null; skinchanger_loadout_entries: SkinchangerLoadoutEntry[] }
export interface SkinchangerJob { id: string; server_id: string; loadout_version: number; status: "queued" | "leased" | "applied" | "failed" | "cancelled"; attempts: number; failure_code: string | null; created_at: string; applied_at: string | null; updated_at: string }
export interface SkinchangerActiveServerSession { server_id: string; player_name: string; connected_at: string; last_seen_at: string }
export interface SkinchangerLoadoutInput { entries: Array<{ catalogItemId: string; slot: SkinchangerSlot; slotKey: string; teamScope: TeamScope; options: SkinchangerAppearanceOptions }> }

export const skinchangerService = {
  getCatalog(filters: { category: SkinchangerCategory; weaponClass?: string; weaponGroup?: SkinchangerFirearmGroup; team?: "t" | "ct"; query?: string; limit?: number; offset?: number }, options?: CallOptions) {
    return get<SkinchangerCatalogPage>("/skinchanger/catalog", filters, options)
  },
  getCatalogFacets(category: SkinchangerCategory, options?: CallOptions) {
    return get<SkinchangerCatalogFacets>("/skinchanger/catalog/facets", { category }, options)
  },
  getLoadout(options?: CallOptions) {
    return get<{ loadout: SkinchangerLoadout }>("/skinchanger/loadout", undefined, options)
  },
  getActiveServer(options?: CallOptions) {
    return get<{ session: SkinchangerActiveServerSession | null }>("/skinchanger/active-server", undefined, options)
  },
  saveLoadout(input: SkinchangerLoadoutInput, options?: CallOptions) {
    return put<{ version: number; entryCount: number }>("/skinchanger/loadout", input, options)
  },
  queueApply(serverId: string, options?: CallOptions) {
    return post<{ jobId: string; status: "queued" }>("/skinchanger/apply", { serverId }, options)
  },
  getStatus(options?: CallOptions) {
    return get<{ jobs: SkinchangerJob[] }>("/skinchanger/status", undefined, options)
  },
}
