/**
 * Centralized API domain models.
 *
 * These types mirror the shapes currently consumed by the UI pages in
 * `src/lib/data.ts` so that the existing pages can be wired to the API
 * without reshaping their props. Generic response wrappers are defined
 * here so every service returns a consistent envelope.
 */

/* ----------------------------------------------------------------------------
 * Generic API envelope
 * ------------------------------------------------------------------------- */

/** A single successful resource response. */
export interface ApiResponse<T> {
  data: T
  meta?: ListMeta
}

/** Pagination / list metadata returned alongside collection responses. */
export interface ListMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

/** A standardized, serializable error thrown by the API client. */
export interface ApiError {
  /** HTTP status code, or 0 for network/timeout failures. */
  status: number
  /** Stable machine-readable code, e.g. "unauthorized", "rate_limited". */
  code: string
  /** Human-readable message safe to surface in the UI. */
  message: string
  /** Field-level validation errors keyed by field name (422 responses). */
  fields?: Record<string, string[]>
  /** A controlled backend error reason safe for page-specific handling. */
  reason?: string
  /** ISO timestamp used only by explicit retry/cooldown responses. */
  retryAt?: string
}

/* ----------------------------------------------------------------------------
 * Navigation
 * ------------------------------------------------------------------------- */

export type PageId =
  | "home"
  | "play-5vs5"
  | "play-fun"
  | "play-proleague"
  | "play-tournaments"
  | "leaders"
  | "clan"
  | "shop"
  | "skinchanger"
  | "penalties"
  | "explore"
  | "feedback"
  | "profile"
  | "wallet"

/* ----------------------------------------------------------------------------
 * Auth
 * ------------------------------------------------------------------------- */

export interface AuthSession {
  accessToken: string
  refreshToken?: string
  expiresAt?: string
  user: UserProfile
}

/* ----------------------------------------------------------------------------
 * Profile / user
 * ------------------------------------------------------------------------- */

export interface ProfileFaceitStats {
  username: string
  elo: number
  level: number
}

export type FaceitProfileData =
  | { linked: false }
  | {
      linked: true
      playerId: string
      nickname: string
      avatar: string
      country: string
      region: string
      elo: number
      level: number
      faceitUrl: string
      stats: {
        matches: number
        wins: number
        winRate: number
        averageKd: number
        averageKills: number
        headshots: number
      }
      recentMatches: Array<{
        id: string
        competition: string
        map: string
        status: string
        finishedAt: string
        faceitUrl: string
      }>
    }

export interface ProfileLink {
  url: string
}

export interface ProfileLinksPayload {
  links: ProfileLink[]
}

export interface UserProfile {
  id: string
  steamId: string
  username: string
  avatar: string
  balance: number
  role: "Owner" | "Founder" | "Manager" | "Admin" | "Player" | "Designer" | "Developer"
  moderationStatus?: ModerationStatus
  clan?: {
    id: string
    name: string
    tag: string
  } | null
  steamBackground?: string | null
  faceit?: ProfileFaceitStats
  links?: ProfileLink[]
}

export interface CompetitiveProfile {
  user_id: string
  steam_id: string
  username: string
  avatar: string
  current_exp: number
  rank_id: number
  rank_slug: string
  rank_name: string
  rank_image_key: string
  pro_league_unlocked: boolean
  matches_completed: number
  wins: number
  losses: number
  kills: number
  assists: number
  headshot_kills: number
  last_match_at: string | null
  current_rank_min_exp: number
  next_rank_id: number | null
  next_rank_name: string | null
  next_rank_min_exp: number | null
}

export interface CompetitiveLeaderboardEntry extends CompetitiveProfile {
  position: number
  deaths: number
  kd_ratio: number
  played_hours: number
}

export interface CompetitiveAccess {
  competitive: Pick<CompetitiveProfile, "current_exp" | "rank_id" | "rank_name" | "rank_image_key" | "pro_league_unlocked"> | null
  proLeagueUnlocked: boolean
  requiredRankId: number
  requiredRankName: string
}

export interface ProfileStats {
  matches: number
  wins: number
  kdRatio: number
}

export interface ProfileRecentMatch {
  map: string
  result: "Win" | "Loss"
  score: string
  kd: string
}

/* ----------------------------------------------------------------------------
 * Play / matches
 * ------------------------------------------------------------------------- */

export type PlaySubMode = "5vs5" | "fun" | "proleague" | "tournaments"

export type MatchStatus = "live" | "waiting" | "finished" | "locked"

export interface MatchInfo {
  id: string
  number: number
  map: string
  /** Exact server address when the match service exposes its assigned game server. */
  connectAddress?: string
  players: number
  maxPlayers: number
  status: MatchStatus
  favorite: boolean
  signal: number
  scoreT: number
  scoreCT: number
}

export interface MatchFilters {
  status?: MatchStatus
  mode?: PlaySubMode
}

/* ----------------------------------------------------------------------------
 * Servers
 * ------------------------------------------------------------------------- */

export type ServerStatus = "online" | "offline" | "full"

export interface ServerInfo {
  id: string
  name: string
  map: string
  players: number
  maxPlayers: number
  mode: string
  ping: number
  status: ServerStatus
  connectAddress?: string
}

/** A verified, player-specific reconnect opportunity from the Root API. */
export interface ReconnectMatch {
  sessionId: string
  serverId: string
  serverName: string
  connectAddress: string
  map: string
  mode: string
  disconnectedAt: string
  reconnectableUntil: string
  playerCount: number
}

export interface ServerLiveMatchPlayer {
  steamId: string
  name: string
  connected: boolean
  rankId: number | null
  rankName: string | null
  rankImageKey: string | null
  adr: number | null
  ping: number | null
}

export interface ServerLiveMatch {
  serverId: string
  serverName: string
  map: string
  mode: string
  state: "waiting" | "live" | "paused" | "ended" | "unavailable"
  round: number | null
  score: { t: number; ct: number } | null
  teams: { t: ServerLiveMatchPlayer[]; ct: ServerLiveMatchPlayer[] }
  spectators: ServerLiveMatchPlayer[]
  connectedPlayers: ServerLiveMatchPlayer[]
  updatedAt: string | null
  availability: "live_snapshot" | "roster_only" | "unavailable"
}

export interface ServerFilters {
  mode?: string
  status?: ServerStatus
}

/* ----------------------------------------------------------------------------
 * Community player performance
 * ------------------------------------------------------------------------- */

export interface CommunityPlayer {
  /** Stable user identifier. Present for search results and used for profile navigation. */
  id?: string
  steamId?: string
  name: string
  kills: number
  deaths: number
  kd: number
  headshots: number
  matches: number
  wins: number
  playedHours: number
  lastPlayed: string
  avatar: string
  moderationStatus: ModerationStatus
}

export type ModerationStatus = "Banned" | "Muted" | "Gag" | "Clear"

/* ----------------------------------------------------------------------------
 * Clans
 * ------------------------------------------------------------------------- */

export interface ClanCard {
  id: string
  name: string
  tag: string
  logo: string
  thumbnail: string | null
  currentPlayers: number
  maxPlayers: number
  region: string
}

export interface ClanDetail extends ClanCard {
  description?: string
  members?: ClanMember[]
}

export interface ClanMember {
  id: string
  name: string
  role: string
  avatar: string
  description: string
}

export interface CreateClanRequest {
  name: string
  tag: string
  logo: string
  thumbnail?: string | null
  region?: string
}

export interface TeamMember {
  name: string
  role: string
  avatar: string
  description: string
}

/* ----------------------------------------------------------------------------
 * Tournaments
 * ------------------------------------------------------------------------- */

export type TournamentMatchStatus = "live" | "upcoming" | "completed"

export interface TournamentMatch {
  id: string
  teamA: string
  teamB: string
  round: string
  map: string
  time: string
  score: string | null
  status: TournamentMatchStatus
}

export interface TournamentBracket {
  round: string
  matches: TournamentMatch[]
}

export interface TournamentInfo {
  season: string
  prizePool: string
  format: string
  registeredClans: number
  nextMatchTime: string
}

/* ----------------------------------------------------------------------------
 * Store / shop
 * ------------------------------------------------------------------------- */

export type ShopRarity = "Common" | "Rare" | "Epic" | "Legendary"

export interface ShopItem {
  id: string
  name: string
  category: string
  price: number
  image: string
  rarity: ShopRarity
}

export interface ShopFilters {
  category?: string
  rarity?: ShopRarity
}

/* ----------------------------------------------------------------------------
 * Staff panel
 * ------------------------------------------------------------------------- */

export type StaffPanelRole = "OWNER" | "MANAGER"

export interface StaffPanelAccess {
  role: StaffPanelRole
  username: string
  capabilities: string[]
}

export interface StaffPanelServer {
  server_id: string
  name: string
  map_name: string
  mode: string
  player_count: number
  last_heartbeat_at: string | null
}

export interface StaffPanelAction {
  id: string
  status: "pending" | "claimed" | "completed" | "failed" | "cancelled"
  action_type: string
  server_id: string
  created_at: string
}

export interface StaffPanelOverview {
  role: StaffPanelRole
  servers: StaffPanelServer[]
  pendingActions: StaffPanelAction[]
}

export interface StaffPanelRosterPlayer extends ServerLiveMatchPlayer {
  team: "T" | "CT" | "SPECTATOR" | "UNASSIGNED"
}

export interface StaffPanelServerRoster {
  server: {
    id: string
    name: string
    map: string
    mode: string
    playerCount: number
    state: "waiting" | "live" | "paused" | "ended" | "unavailable"
    availability: "live_snapshot" | "roster_only" | "unavailable"
    updatedAt: string | null
  }
  players: StaffPanelRosterPlayer[]
}

export interface StaffPanelProduct extends ShopItem {
  active: boolean
}

export interface StaffPanelDatabaseOverview {
  tables: Array<{ name: string; count: number }>
}

export interface StaffPanelMember {
  id: string
  userId: string
  username: string
  steamId: string
  avatar: string
  role: "OWNER" | "MANAGER" | "ADMIN" | "DEVELOPER" | "DESIGNER"
  permissions: string[]
  status: "active" | "suspended" | "revoked"
  createdAt: string
  updatedAt: string
}

export interface StaffPanelMaintenance {
  website: "legacyx.cc"
  enabled: boolean
  updatedAt: string | null
  availability: "configured" | "not_configured"
}

export interface StaffPanelHealth {
  availability: "telemetry" | "unavailable"
  cpuPercent: number | null
  memoryPercent: number | null
  diskPercent: number | null
  loadAverage: number | null
  healthy: boolean | null
  updatedAt: string | null
}

export interface StaffPanelActionRequest {
  serverId: string
  type: "ban" | "unban" | "kick" | "mute" | "rename" | "map_change" | "server_announcement" | "match_announcement" | "hud_announcement" | "player_hud_alert" | "player_message" | "restart_all" | "restart_server" | "start_server" | "stop_server" | "timeout" | "unpause" | "round_restart" | "round_restore" | "player_ip_lookup"
  playerSteamId?: string
  playerName?: string
  map?: string
  message?: string
  durationSeconds?: number
  reason?: string
  banTerm?: "10m" | "30m" | "1h" | "1d" | "7d" | "permanent"
  enforceAfterSeconds?: number
  alertColor?: "gold" | "sky" | "red" | "green" | "neutral"
  countdownSeconds?: number
  newName?: string
  mapImpactAcknowledged?: true
}

/* ----------------------------------------------------------------------------
 * Skinchanger catalog / local API flow
 * ------------------------------------------------------------------------- */

export type SkinCatalogCategory = "weapons" | "weapon_skins" | "knives" | "gloves" | "agents" | "music_kits" | "pins"

export interface SkinCatalogItem {
  id: string
  name: string
  category: SkinCatalogCategory
  image: string
  weapon?: string
  rarity?: string
  collection?: string
}

export interface SkinCatalogPage {
  entries: SkinCatalogItem[]
  total: number
  page: number
  pageSize: number
}

export interface SkinLoadout {
  version: number
  entries: SkinCatalogItem[]
}

export type SkinApplyState = "idle" | "queued" | "applied"

export interface SkinApplyStatus {
  state: SkinApplyState
  jobId?: string
  serverId: string
  serverName: string
  message: string
  loadoutVersion: number
}

export interface SkinchangerApplyResponse {
  loadout: SkinLoadout
  status: SkinApplyStatus
}

/* ----------------------------------------------------------------------------
 * Wallet
 * ------------------------------------------------------------------------- */

export type WalletTransactionType = "Charge" | "Purchase"

export interface WalletTransaction {
  id: string
  type: WalletTransactionType
  amount: number
  method: string
  date: string
}

export interface WalletBalance {
  balance: number
  currency: string
}

export type PaymentMethod = "qpay" | "card"

export interface ChargeRequest {
  amount: number
  method: PaymentMethod
}

export type PromotionContext = "wallet_topup" | "wallet_redeem" | "store_purchase"
export type PromotionBenefitType = "wallet_credit" | "wallet_rate_override" | "wallet_percent" | "wallet_fixed" | "store_percent" | "store_fixed" | "admin_role"

export interface PromotionQuote {
  codeHint: string
  campaignName: string
  ownerKind: "legacyx" | "creator" | "partner"
  benefitType: PromotionBenefitType
  context: PromotionContext
  baseAmount: number
  finalAmount: number
  discountAmount: number
  currency: "MNT" | "coins"
  redeemable: boolean
  message: string
}

export interface PromotionRedemption {
  redemptionId: string
  alreadyRedeemed: boolean
  benefitType: PromotionBenefitType
  benefitValue: number
  balance: number
  role: UserProfile["role"]
  entitlementId?: string | null
}

export interface PromotionHistoryItem {
  id: string
  context: Exclude<PromotionContext, "wallet_topup">
  status: "redeemed" | "revoked"
  benefitType: PromotionBenefitType
  benefitValue: number
  codeHint: string
  createdAt: string
  campaignName: string
  ownerKind: "legacyx" | "creator" | "partner"
}

/* ----------------------------------------------------------------------------
 * Moderation / penalties
 * ------------------------------------------------------------------------- */

export type PenaltyType = "ban" | "mute" | "gag"

export interface PenaltyEntry {
  id: string
  type: PenaltyType
  player: string
  playerSteamId?: string
  avatar: string
  moderationStatus: ModerationStatus
  reason: string
  term: string
  isPermanent: boolean
  isUnbanned: boolean
  admin: string
  adminSteamId?: string
  date: string
}

export interface PenaltyStats {
  totalBans: number
  activeBans: number
  permanentBans: number
  totalMutes: number
  totalGags: number
}

export interface PenaltyFilters {
  type?: PenaltyType
  query?: string
}

/* ----------------------------------------------------------------------------
 * Feedback
 * ------------------------------------------------------------------------- */

export interface FeedbackEntry {
  id: string
  /** Present only when the review was authored by a registered LEGACY-X user. */
  steamId?: string
  avatar?: string
  name: string
  rating: number
  message: string
  date: string
}

export interface CreateFeedbackRequest {
  rating: number
  message: string
}

/* ----------------------------------------------------------------------------
 * Search
 * ------------------------------------------------------------------------- */

export type SearchKind = "players" | "clans"

export interface SearchRequest {
  query: string
  kind: SearchKind
}

export interface SearchPlayersResult {
  players: CommunityPlayer[]
}

export interface SearchClansResult {
  clans: ClanCard[]
}

/* ----------------------------------------------------------------------------
 * Community / partners
 * ------------------------------------------------------------------------- */

export interface CommunityCreator {
  id: string
  name: string
  handle: string
  url: string
}

export interface CommunityPartner {
  id: string
  name: string
  description: string
  type: "website"
  url: string
}

export interface CommunityContent {
  creators: CommunityCreator[]
  partners: CommunityPartner[]
}

/* ----------------------------------------------------------------------------
 * Home stats
 * ------------------------------------------------------------------------- */

export interface HomeStats {
  playersOnline: number
  liveServers: number
  matchesToday: number
  activeClans: number
}
