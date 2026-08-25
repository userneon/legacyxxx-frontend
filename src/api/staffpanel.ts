import { del, get, post, type CallOptions } from "./client"
import type { StaffPanelAccess, StaffPanelAction, StaffPanelActionRequest, StaffPanelDatabaseOverview, StaffPanelOverview, StaffPanelProduct } from "./types"

export const staffPanelService = {
  access: (options?: CallOptions) => get<StaffPanelAccess>("/staffpanel/access", undefined, options),
  overview: (options?: CallOptions) => get<StaffPanelOverview>("/staffpanel/overview", undefined, options),
  database: (options?: CallOptions) => get<StaffPanelDatabaseOverview>("/staffpanel/database", undefined, options),
  products: (options?: CallOptions) => get<StaffPanelProduct[]>("/staffpanel/products", undefined, options),
  createProduct: (input: Pick<StaffPanelProduct, "name" | "category" | "price" | "image" | "rarity">, options?: CallOptions) => post<StaffPanelProduct>("/staffpanel/products", input, options),
  archiveProduct: (itemId: string, options?: CallOptions) => del<void>(`/staffpanel/products/${encodeURIComponent(itemId)}`, options),
  queueAction: (input: StaffPanelActionRequest, options?: CallOptions) => post<{ action: StaffPanelAction }>("/staffpanel/actions", input, options),
}
