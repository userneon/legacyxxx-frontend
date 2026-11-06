import { get, post, put, type CallOptions } from "./client"
import type { StaffPanelAccess, StaffPanelAction, StaffPanelActionRequest, StaffPanelDatabaseOverview, StaffPanelOverview } from "./types"

export const staffPanelService = {
  access: (options?: CallOptions) => get<StaffPanelAccess>("/staffpanel/access", undefined, options),
  overview: (options?: CallOptions) => get<StaffPanelOverview>("/staffpanel/overview", undefined, options),
  database: (options?: CallOptions) => get<StaffPanelDatabaseOverview>("/staffpanel/database", undefined, options),
  /** Owner only: the name the website gives a server; the game server sets its hostname from it with its next heartbeat. */
  renameServer: (serverId: string, name: string, options?: CallOptions) => put<{ serverId: string; name: string }>(`/staffpanel/servers/${encodeURIComponent(serverId)}/name`, { name }, options),
  queueAction: (input: StaffPanelActionRequest, options?: CallOptions) => post<{ action: StaffPanelAction }>("/staffpanel/actions", input, options),
}
