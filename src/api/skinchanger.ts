import { get, put, request, type CallOptions } from "./client"

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
export interface SkinchangerLoadoutInput { entries: Array<{ catalogItemId: string; slot: SkinchangerSlot; slotKey: string; teamScope: TeamScope; options: SkinchangerAppearanceOptions }> }
export interface SkinchangerEntryMutationInput { expectedVersion: number; entry: { catalogItemId: string; slot: SkinchangerSlot; slotKey: string; teamScope: TeamScope; options: SkinchangerAppearanceOptions } }
export interface SkinchangerEntryRemovalInput { expectedVersion: number; slotKey: string; teamScope: TeamScope }

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
  saveLoadout(input: SkinchangerLoadoutInput, options?: CallOptions) {
    return put<{ version: number; entryCount: number }>("/skinchanger/loadout", input, options)
  },
  saveLoadoutEntry(input: SkinchangerEntryMutationInput, options?: CallOptions) {
    return put<{ version: number }>("/skinchanger/loadout/entry", input, options)
  },
  removeLoadoutEntry(input: SkinchangerEntryRemovalInput, options?: CallOptions) {
    return request<{ version: number; removed: boolean }>("/skinchanger/loadout/entry", { ...options, method: "DELETE", body: input })
  },
}
