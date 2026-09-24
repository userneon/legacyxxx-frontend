import { apiUrl, del, get, patch, post, put, type CallOptions } from "./client"

/* ---------------------------------------------------------------------------
 * Types (mirror server/legacyX/admin/* responses)
 * ------------------------------------------------------------------------- */

export interface StaffRole { id: string; name: string; immunity: number }
export interface StaffIdentity { roles: StaffRole[]; permissions: string[]; immunity: number }
export interface MeResponse {
  user: { id: string; steamId: string; username: string; avatar: string }
  staff: StaffIdentity | null
}

export interface PlayerCard { steamId: string; userId: string | null; name: string; avatar: string }
export interface StaffCard { userId: string | null; steamId: string; name: string; avatar: string }

export interface PlayerFlags {
  previousBan: boolean
  vacBans: number
  gameBans: number
  newAccount: boolean
  manyNameChanges: boolean
  firstVisit: boolean
}

export interface ServerSummary {
  id: string
  name: string
  map: string
  mode: string
  maxPlayers: number
  address: string | null
  online: boolean
  lastSeenAt: string | null
  players: number
  apiKeyPrefix?: string | null
  apiKeyRotatedAt?: string | null
  hasApiKey?: boolean
}

export interface SessionRow {
  sessionId: string
  steamId: string
  name: string
  avatar: string
  matchId: string | null
  serverId: string
  connectedAt: string
  disconnectedAt: string | null
  immunity: number
  flags?: PlayerFlags
}

export interface ChatMessage { id: number; steamId: string; name: string; message: string; teamOnly: boolean; serverId: string; matchId: string | null; sentAt: string }

export type Duration = { permanent: true } | { permanent: false; minutes: number }

export interface Punishment {
  id: string
  type: "ban" | "mute"
  kind: "voice" | "chat" | "all" | null
  steamId: string
  reason: string
  permanent: boolean
  expiresAt: string | null
  status: "active" | "expired" | "revoked"
  reviewStatus: "none" | "pending" | "approved" | "rejected" | null
  issuer: StaffCard | null
  issuerImmunity: number
  source: "panel" | "game"
  serverId: string | null
  matchId: string | null
  revokedAt: string | null
  revokedBy: StaffCard | null
  revokeReason: string | null
  createdAt: string
  player?: PlayerCard
  canRevoke?: boolean
}

export interface Report {
  id: string
  target: PlayerCard
  targetName: string | null
  reporter: PlayerCard | null
  reporterAccuracy: { accuracy: number | null; total: number; actioned: number } | null
  reason: string
  details: string | null
  status: "open" | "actioned" | "dismissed"
  serverId: string | null
  matchId: string | null
  handledBy: StaffCard | null
  handledAt: string | null
  outcomeNote: string | null
  createdAt: string
}

export interface AuditEntry {
  id: number
  action: string
  actor: StaffCard | null
  actorImmunity: number | null
  targetType: string | null
  targetId: string | null
  targetSteamId: string | null
  serverId: string | null
  before: unknown
  after: unknown
  metadata: Record<string, unknown>
  createdAt: string
}

export interface Appeal {
  id: string
  player?: PlayerCard
  message: string
  status: "open" | "accepted" | "rejected"
  response: string | null
  handledBy: StaffCard | null
  handledAt: string | null
  createdAt: string
  ban: Punishment | null
}

export interface Badge { reports: number; reviewQueue: number; total: number }

export interface Dashboard {
  openReports: number | null
  reviewQueue: number | null
  openAppeals: number | null
  activeBans: number | null
  activeMutes: number | null
  onlinePlayers: number
  servers: ServerSummary[]
  recentActions: AuditEntry[]
}

export interface SearchResult {
  players: PlayerCard[]
  matches: { matchId: string; serverId: string; lastSeenAt: string }[]
}

export interface ServerDetail {
  server: { id: string; name: string; map: string; mode: string; maxPlayers: number; online: boolean; lastSeenAt: string | null }
  matchId: string | null
  players: SessionRow[]
}

export interface MatchDetail {
  matchId: string
  server: { id: string; name: string; map: string } | null
  live: boolean
  players: SessionRow[]
  chat: ChatMessage[]
  reports: Report[]
}

export interface ModerationHeader {
  player: PlayerCard & { hasAccount: boolean }
  staffRole: { name: string; immunity: number } | null
  aboveYourRank: boolean
  activeBan: { id: string; reason: string; permanent: boolean; expiresAt: string | null } | null
  activeMute: { id: string; kind: string; reason: string; permanent: boolean; expiresAt: string | null } | null
  live: { serverId: string; matchId: string | null } | null
  flags?: PlayerFlags
  counts: { bans: number; mutes: number; reports: number; notes: number }
  actions: { kick: boolean; mute: boolean; ban: boolean; banPermanent: boolean; note: boolean }
  tabs: { punishments: boolean; sessions: boolean; reports: boolean; chat: boolean; names: boolean; notes: boolean; audit: boolean }
}

export interface PublicPlayer { steamId: string; username: string; avatar: string; level: number; rank: string; memberSince: string }

export interface RoleDetail {
  id: string
  name: string
  immunity: number
  isLocked: boolean
  permissions: string[]
  members: (StaffCard & { grantedAt: string; grantedBy: StaffCard | null })[]
}
export interface PermissionInfo { key: string; description: string; ownerOnly: boolean }

export interface Product { id: string; name: string; description: string | null; priceMnt: number; isActive: boolean; sortOrder: number; updatedAt: string }
export interface AnnouncementItem { id: string; channel: "web" | "ingame"; title: string; body: string; startsAt: string; endsAt: string | null; isActive: boolean; createdAt: string }
export interface NameFilter { id: string; pattern: string; matchType: "exact" | "contains" | "regex"; action: "flag" | "block"; note: string | null; isActive: boolean; updatedAt: string }
export interface SiteConfigHistory {
  current: { version: number; config: Record<string, unknown> }
  versions: { version: number; note: string | null; rolledBackFrom: number | null; createdBy: StaffCard | null; createdAt: string }[]
}

export type ModerationTab = "punishments" | "sessions" | "reports" | "chat" | "names" | "notes" | "audit"

/* ---------------------------------------------------------------------------
 * Service
 * ------------------------------------------------------------------------- */

type Page = { limit?: number; offset?: number }

export const adminService = {
  me: (options?: CallOptions) => get<MeResponse>("/users/me", undefined, options),
  badge: (options?: CallOptions) => get<Badge>("/admin/badge", undefined, options),
  dashboard: (options?: CallOptions) => get<Dashboard>("/admin/dashboard", undefined, options),
  search: (q: string, options?: CallOptions) => get<SearchResult>("/admin/search", { q }, options),
  live: (options?: CallOptions) => get<{ servers: ServerSummary[]; current: { serverId: string; matchId: string | null } | null }>("/admin/live", undefined, options),

  reauthStatus: (options?: CallOptions) => get<{ fresh: boolean; expiresAt: string | null }>("/admin/reauth/status", undefined, options),
  reauthUrl: (returnTo: string) => apiUrl(`/admin/reauth/steam?returnTo=${encodeURIComponent(returnTo)}`),

  servers: (options?: CallOptions) => get<{ servers: ServerSummary[] }>("/admin/servers", undefined, options),
  createServer: (body: { name: string; ipAddress?: string; port?: number; mode?: string; maxPlayers?: number }) => post<{ server: { id: string; name: string }; apiKey: string }>("/admin/servers", body),
  rotateServerKey: (id: string) => post<{ apiKey: string }>(`/admin/servers/${id}/rotate-key`, {}),
  deleteServer: (id: string, confirm: string) => post<{ ok: true }>(`/admin/servers/${id}/delete`, { confirm }),
  server: (id: string, options?: CallOptions) => get<ServerDetail>(`/admin/servers/${id}`, undefined, options),
  serverRecent: (id: string, hours = 5, options?: CallOptions) => get<{ hours: number; rows: SessionRow[] }>(`/admin/servers/${id}/recent`, { hours }, options),
  serverChat: (id: string, before?: string, options?: CallOptions) => get<{ messages: ChatMessage[] }>(`/admin/servers/${id}/chat`, { before }, options),
  serverActions: (id: string, options?: CallOptions) => get<{ audit: AuditEntry[]; queue: { id: string; action: string; targetSteamId: string | null; status: string; failure: string | null; createdAt: string; completedAt: string | null }[] }>(`/admin/servers/${id}/actions`, undefined, options),
  serverCommand: (id: string, body: { action: "map_change"; map: string } | { action: "round_restart" }) => post<{ ok: true; actionId: string }>(`/admin/servers/${id}/commands`, body),
  match: (matchId: string, options?: CallOptions) => get<MatchDetail>(`/admin/matches/${encodeURIComponent(matchId)}`, undefined, options),

  publicPlayer: (steamId: string, options?: CallOptions) => get<PublicPlayer>(`/players/${steamId}`, undefined, options),
  moderation: (steamId: string, options?: CallOptions) => get<ModerationHeader>(`/players/${steamId}/moderation`, undefined, options),
  moderationTab: <T = unknown>(steamId: string, tab: ModerationTab, options?: CallOptions) => get<{ items: T[] }>(`/players/${steamId}/moderation/${tab}`, undefined, options),
  addNote: (steamId: string, body: string) => post<{ id: string }>(`/players/${steamId}/notes`, { body }),

  kick: (steamId: string, reason: string) => post<{ ok: true }>(`/admin/players/${steamId}/kick`, { reason }),
  bans: (query: { status?: string; q?: string } & Page, options?: CallOptions) => get<{ total: number; items: Punishment[] }>("/admin/bans", query, options),
  issueBan: (body: { steamId: string; reason: string; duration: Duration }) => post<{ id: string; reviewStatus: string }>("/admin/bans", body),
  changeBan: (id: string, duration: Duration) => patch<{ id: string }>(`/admin/bans/${id}`, { duration }),
  revokeBan: (id: string, reason: string) => post<{ ok: true }>(`/admin/bans/${id}/revoke`, { reason }),
  reviewQueue: (options?: CallOptions) => get<{ total: number; items: Punishment[] }>("/admin/review-queue", undefined, options),
  reviewBan: (id: string, decision: "approve" | "reject", note?: string) => post<{ ok: true }>(`/admin/review-queue/${id}`, { decision, note }),
  mutes: (query: { status?: string; q?: string } & Page, options?: CallOptions) => get<{ total: number; items: Punishment[] }>("/admin/mutes", query, options),
  issueMute: (body: { steamId: string; kind: "voice" | "chat" | "all"; reason: string; duration: Duration }) => post<{ id: string }>("/admin/mutes", body),
  revokeMute: (id: string, reason: string) => post<{ ok: true }>(`/admin/mutes/${id}/revoke`, { reason }),
  appeals: (status: string, options?: CallOptions) => get<{ items: Appeal[] }>("/admin/appeals", { status }, options),
  handleAppeal: (id: string, decision: "accept" | "reject", response?: string) => post<{ ok: true }>(`/admin/appeals/${id}`, { decision, response }),
  reports: (query: { status?: string; serverId?: string } & Page, options?: CallOptions) => get<{ total: number; items: Report[]; canSeeReporter: boolean }>("/admin/reports", query, options),
  handleReport: (id: string, status: "actioned" | "dismissed", note?: string) => post<{ ok: true }>(`/admin/reports/${id}`, { status, note }),
  audit: (query: { action?: string; actor?: string; target?: string; beforeId?: number }, options?: CallOptions) => get<{ items: AuditEntry[] }>("/admin/audit", query, options),

  roles: (options?: CallOptions) => get<{ roles: RoleDetail[]; permissions: PermissionInfo[] }>("/admin/roles", undefined, options),
  assignRole: (roleId: string, steamId: string, confirm: string) => post<{ ok: true }>(`/admin/roles/${roleId}/members`, { steamId, confirm }),
  removeRole: (roleId: string, steamId: string, confirm: string) => post<{ ok: true }>(`/admin/roles/${roleId}/members/${steamId}/remove`, { confirm }),
  setRolePermissions: (roleId: string, permissions: string[], confirm: string) => put<{ ok: true; added: string[]; removed: string[] }>(`/admin/roles/${roleId}/permissions`, { permissions, confirm }),
  setRoleImmunity: (roleId: string, immunity: number, confirm: string) => put<{ ok: true }>(`/admin/roles/${roleId}/immunity`, { immunity, confirm }),

  products: (options?: CallOptions) => get<{ items: Product[] }>("/admin/products", undefined, options),
  createProduct: (body: Omit<Product, "id" | "updatedAt">) => post<Product>("/admin/products", body),
  updateProduct: (id: string, body: Partial<Omit<Product, "id" | "updatedAt">>) => patch<Product>(`/admin/products/${id}`, body),
  deleteProduct: (id: string) => del<{ ok: true }>(`/admin/products/${id}`),

  announcements: (options?: CallOptions) => get<{ items: AnnouncementItem[] }>("/admin/announcements", undefined, options),
  createAnnouncement: (body: { channel: "web" | "ingame"; title: string; body: string; endsAt?: string | null; isActive?: boolean }) => post<AnnouncementItem>("/admin/announcements", body),
  updateAnnouncement: (id: string, body: Partial<{ title: string; body: string; endsAt: string | null; isActive: boolean }>) => patch<AnnouncementItem>(`/admin/announcements/${id}`, body),
  deleteAnnouncement: (id: string) => del<{ ok: true }>(`/admin/announcements/${id}`),

  siteConfig: (options?: CallOptions) => get<SiteConfigHistory>("/admin/site-config", undefined, options),
  saveSiteConfig: (config: Record<string, unknown>, baseVersion: number, note?: string) => post<{ version: number }>("/admin/site-config", { config, baseVersion, note }),
  rollbackSiteConfig: (version: number) => post<{ version: number }>(`/admin/site-config/${version}/rollback`, {}),

  nameFilters: (options?: CallOptions) => get<{ items: NameFilter[] }>("/admin/name-filters", undefined, options),
  createNameFilter: (body: { pattern: string; matchType: NameFilter["matchType"]; action: NameFilter["action"]; note?: string | null }) => post<NameFilter>("/admin/name-filters", body),
  updateNameFilter: (id: string, body: Partial<{ isActive: boolean; action: NameFilter["action"]; note: string | null }>) => patch<NameFilter>(`/admin/name-filters/${id}`, body),
  deleteNameFilter: (id: string) => del<{ ok: true }>(`/admin/name-filters/${id}`),
}
