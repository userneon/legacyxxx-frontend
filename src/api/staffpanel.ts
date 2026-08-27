import { del, get, patch, post, put, type CallOptions } from "./client"
import type { PenaltyEntry, PhantomEvidenceEntry, PhantomSuspensionCase, StaffPanelAccess, StaffPanelAction, StaffPanelActionRequest, StaffPanelDatabaseOverview, StaffPanelHealth, StaffPanelMaintenance, StaffPanelMember, StaffPanelOverview, StaffPanelProduct, StaffPanelServerRoster } from "./types"

export const staffPanelService = {
  access: (options?: CallOptions) => get<StaffPanelAccess>("/staffpanel/access", undefined, options),
  overview: (options?: CallOptions) => get<StaffPanelOverview>("/staffpanel/overview", undefined, options),
  roster: (serverId: string, options?: CallOptions) => get<StaffPanelServerRoster>(`/staffpanel/servers/${encodeURIComponent(serverId)}/roster`, undefined, options),
  playerPenalties: (steamId: string, options?: CallOptions) => get<{ penalties: PenaltyEntry[] }>(`/staffpanel/players/${encodeURIComponent(steamId)}/penalties`, undefined, options),
  database: (options?: CallOptions) => get<StaffPanelDatabaseOverview>("/staffpanel/database", undefined, options),
  staff: (options?: CallOptions) => get<StaffPanelMember[]>("/staffpanel/staff", undefined, options),
  createStaff: (input: Pick<StaffPanelMember, "userId" | "role" | "permissions" | "gamePermissions" | "stamina" | "immunity" | "status">, options?: CallOptions) => post<StaffPanelMember>("/staffpanel/staff", input, options),
  updateStaff: (staffId: string, input: Partial<Pick<StaffPanelMember, "role" | "permissions" | "gamePermissions" | "stamina" | "immunity" | "status">>, options?: CallOptions) => put<StaffPanelMember>(`/staffpanel/staff/${encodeURIComponent(staffId)}`, input, options),
  maintenance: (options?: CallOptions) => get<StaffPanelMaintenance>("/staffpanel/maintenance", undefined, options),
  updateMaintenance: (input: Pick<StaffPanelMaintenance, "website" | "enabled">, options?: CallOptions) => put<StaffPanelMaintenance>("/staffpanel/maintenance", input, options),
  phantomCases: (options?: CallOptions) => get<{ cases: PhantomSuspensionCase[] }>("/staffpanel/anti-cheat/phantom-cases", undefined, options),
  phantomEvidence: (options?: CallOptions) => get<{ evidence: PhantomEvidenceEntry[] }>("/staffpanel/anti-cheat/phantom-evidence", undefined, options),
  reviewPhantomCase: (caseId: string, input: { decision: "clear" | "keep" | "confirm_ban"; note: string }, options?: CallOptions) => patch<{ case: PhantomSuspensionCase }>(`/staffpanel/anti-cheat/phantom-cases/${encodeURIComponent(caseId)}`, input, options),
  health: (options?: CallOptions) => get<StaffPanelHealth>("/staffpanel/health", undefined, options),
  products: (options?: CallOptions) => get<StaffPanelProduct[]>("/staffpanel/products", undefined, options),
  createProduct: (input: Pick<StaffPanelProduct, "name" | "category" | "price" | "image" | "rarity">, options?: CallOptions) => post<StaffPanelProduct>("/staffpanel/products", input, options),
  archiveProduct: (itemId: string, options?: CallOptions) => del<void>(`/staffpanel/products/${encodeURIComponent(itemId)}`, options),
  queueAction: (input: StaffPanelActionRequest, options?: CallOptions) => post<{ action: StaffPanelAction }>("/staffpanel/actions", input, options),
}
