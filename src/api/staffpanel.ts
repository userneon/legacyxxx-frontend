import { get, post, type CallOptions } from "./client"
import type { StaffPanelAccess, StaffPanelAction, StaffPanelActionRequest, StaffPanelDatabaseOverview, StaffPanelOverview } from "./types"

export const staffPanelService = {
  access: (options?: CallOptions) => get<StaffPanelAccess>("/staffpanel/access", undefined, options),
  overview: (options?: CallOptions) => get<StaffPanelOverview>("/staffpanel/overview", undefined, options),
  database: (options?: CallOptions) => get<StaffPanelDatabaseOverview>("/staffpanel/database", undefined, options),
  queueAction: (input: StaffPanelActionRequest, options?: CallOptions) => post<{ action: StaffPanelAction }>("/staffpanel/actions", input, options),
}
