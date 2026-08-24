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

export interface ServerLiveMatchPlayer {
  steamId: string
  name: string
  connected: boolean
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
