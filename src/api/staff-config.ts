import { get, put, type CallOptions } from "./client"

/** A number the Owner can change on the staff site (Staff → Settings). */
export interface SiteSetting {
  key: string
  group: "Play" | "Checks" | "Creators" | "Chat"
  label: string
  hint: string
  unit: string
  def: number
  min: number
  max: number
  value: number
  changed: boolean
  updatedAt: string | null
}

export type CosmeticKindId = "frame" | "name_color" | "name_glow" | "banner" | "title" | "smoke_color" | "grenade_trail" | "grenade_light" | "flash_effect"
export type CosmeticUnlock = "free" | "coin" | "achievement"

/** A cosmetic as staff see it: what they may edit, and how many players own it. */
export interface StaffCosmetic {
  id: string
  kind: CosmeticKindId
  nameEn: string
  nameMn: string
  unlock: CosmeticUnlock
  price: number
  requirement: string
  sort: number
  enabled: boolean
  owners: number
}

export type CosmeticEdit = Pick<StaffCosmetic, "nameEn" | "nameMn" | "unlock" | "price" | "requirement" | "sort" | "enabled">

export const staffConfigService = {
  /** Owner only. */
  settings: async (options?: CallOptions) => (await get<{ settings: SiteSetting[] }>("/api/v1/staff/settings", undefined, options)).settings,
  saveSetting: (key: string, value: number | null, options?: CallOptions) => put<{ key: string; value: number }>(`/api/v1/staff/settings/${encodeURIComponent(key)}`, { value }, options),
  /** Owner or Manager. */
  cosmetics: async (options?: CallOptions) => (await get<{ items: StaffCosmetic[] }>("/api/v1/staff/cosmetics", undefined, options)).items,
  saveCosmetic: (id: string, edit: CosmeticEdit, options?: CallOptions) => put<{ id: string }>(`/api/v1/staff/cosmetics/${encodeURIComponent(id)}`, edit, options),
}

