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
  username: string
  avatar: string
  level: number
  rank: string
  balance: number
  faceit?: ProfileFaceitStats
  links?: ProfileLink[]
}

export interface ProfileStats {
  matches: number
  wins: number
  kdRatio: number
  rating: number
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

export interface ServerFilters {
  mode?: string
  status?: ServerStatus
}

/* ----------------------------------------------------------------------------
 * Players / leaderboard
 * ------------------------------------------------------------------------- */

export interface LeaderPlayer {
  /** Stable user identifier. Present for search results and used for profile navigation. */
  id?: string
  steamId?: string
  rank: number
  name: string
  level: number
  experience: number
  kills: number
  deaths: number
  kd: number
  headshots: number
  playedHours: number
  lastPlayed: string
  avatar: string
}

export interface LeaderboardFilters {
  mode?: PlaySubMode
  region?: string
}

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

export type PenaltyType = "ban" | "comm" | "gag"

export interface PenaltyEntry {
  id: string
  type: PenaltyType
  player: string
  avatar: string
  reason: string
  term: string
  isPermanent: boolean
  isUnbanned: boolean
  admin: string
  date: string
}

export interface PenaltyStats {
  totalBans: number
  activeBans: number
  permanentBans: number
  totalComms: number
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
  players: LeaderPlayer[]
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
  type: "website" | "discord"
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
