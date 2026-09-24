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
  /** The backend reason text. Only the staff panel shows it (permission refusals such as "Target is above your rank"). */
  detail?: string
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
  | "skinchanger"
  | "penalties"
  | "explore"
  | "feedback"
  | "profile"
  | "settings"

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
  /** hidden: the player hid their FACEIT box from other viewers. */
  | { linked: false; hidden?: boolean }
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

/** Profile boxes a player may hide. Penalty history, SteamID, Steam link and rank are always shown. */
export type ProfileSection = "kd" | "matches" | "kills" | "faceit" | "recent_matches" | "loadout"

export interface UserProfile {
  id: string
  steamId: string
  username: string
  avatar: string
  role: "Owner" | "Founder" | "Manager" | "Admin" | "Player" | "Designer" | "Developer"
  moderationStatus?: ModerationStatus
  /** Profile boxes the player hid; absent on older backends (nothing hidden). */
  hiddenSections?: ProfileSection[]
  /** Settings → Notifications; present on the signed-in player's own profile. */
  notificationPrefs?: NotificationPrefs
  steamBackground?: string | null
  /** Equipped Steam Points Shop items; steamBackground is the still image / video poster. */
  steamMedia?: {
    backgroundVideo: { webm: string | null; mp4: string | null } | null
    animatedAvatar: string | null
    avatarFrame: string | null
  } | null
  faceit?: ProfileFaceitStats
  links?: ProfileLink[]
  /** When the account was created on Legacy-X. */
  memberSince?: string | null
  /** Present when the player is on a live server right now. */
  playingNow?: { serverId: string; serverName: string; map: string; connectAddress: string | null } | null
  /** Staff only: penalties issued (public accountability). */
  penaltiesIssued?: number | null
}

export interface ProfileLoadoutShowcase {
  hidden: boolean
  side: "t" | "ct" | null
  items: Array<{ slot: "knife" | "gloves" | "ak47" | "awp"; name: string; imageUrl: string | null }>
}

export interface NotificationPrefs {
  tournaments: boolean
  rankChanges: boolean
  /** Always on. */
  penalties: true
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
  deaths?: number
  /** Position on the EXP ladder; null when unknown. */
  leaderboard_position?: number | null
  /** The player hid their Legacy-X stats; the match stat fields are then absent. */
  stats_hidden?: boolean
}

export interface CompetitiveLeaderboardEntry extends CompetitiveProfile {
  /** Position for the active sort. */
  position: number
  deaths: number
  kd_ratio: number
  win_rate: number
  played_hours: number
}

export type LeaderboardSort = "exp" | "kd" | "win"

export interface CompetitiveLeaderboard {
  sort: LeaderboardSort
  /** K/D and win rate only rank players with at least this many matches. */
  minimumMatches: number
  entries: CompetitiveLeaderboardEntry[]
  /** The signed-in player's own row for the active sort; null when logged out or unranked. */
  viewer: CompetitiveLeaderboardEntry | null
}

export interface CompetitiveAccess {
  competitive: Pick<CompetitiveProfile, "current_exp" | "rank_id" | "rank_name" | "rank_image_key" | "pro_league_unlocked"> | null
  proLeagueUnlocked: boolean
  requiredRankId: number
  requiredRankName: string
  requiredRankImageKey?: string
  requiredExp?: number
  keepExp?: number
}

/** Why a match gave the EXP it did (RANK-SYSTEM.md §6). */
export interface ExpBreakdown {
  reason: "ranked" | "leaver" | "invalid_match" | "low_participation"
  result: number
  margin: number
  performance: number
  bonus: number
  calibration: number
  shortHandedHalved: boolean
  omittedTerms: string[]
}

export interface RankedMatch {
  eventId: string
  matchId: string
  map: string
  outcome: "win" | "draw" | "loss"
  score: { for: number; against: number } | null
  kills: number
  deaths: number
  assists: number
  kd: number
  expBefore: number
  expDelta: number
  expAfter: number
  rankBefore: number
  rankAfter: number
  countsAsRanked: boolean
  breakdown: ExpBreakdown
  calculationVersion: string
  playedAt: string | null
}

export interface RankedMatchPlayer {
  userId: string
  steamId: string
  name: string
  avatar: string
  kills: number | null
  deaths: number | null
  assists: number | null
  expDelta: number
  expAfter: number
  rankId: number
  reason: ExpBreakdown["reason"]
}

export interface RankedMatchDetail {
  matchId: string
  map: string
  state: string
  startedAt: string | null
  finishedAt: string | null
  mode: string | null
  totalRounds: number
  teams: Array<{ key: "team1" | "team2"; roundsWon: number; players: RankedMatchPlayer[] }>
  rounds: MatchDetailRound[]
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
  /** Present for MatchZy matches; needed to open match details. Legacy history rows omit them. */
  matchId?: string
  mapNumber?: number
  playedAt?: string | null
}

export type MatchRoundOutcome = "elimination" | "bomb_exploded" | "bomb_defused" | "time_expired" | "surrender" | "other"

/** One player's line on the match scoreboard. Detail stats are null for matches recorded before they were kept. */
export interface MatchDetailPlayer {
  userId: string | null
  steamId: string
  username: string
  avatar: string
  kills: number
  deaths: number
  assists: number
  kdDiff: number
  headshotPercent: number
  adr: number | null
  kastPercent: number | null
  mvps: number | null
  utilityDamage: number | null
  enemiesFlashed: number | null
  firstKills: number | null
  firstDeaths: number | null
  multiKills: { k3: number; k4: number; k5: number } | null
  clutchesWon: number | null
  ratingDelta: number
  roundsPlayed: number
}

export interface MatchDetailTeam {
  key: "team1" | "team2"
  name: string
  score: number
  won: boolean
  players: MatchDetailPlayer[]
}

export interface MatchDetailRound {
  number: number
  winnerTeam: "team1" | "team2" | null
  winnerSide: "t" | "ct" | null
  outcome: MatchRoundOutcome
  score: { team1: number; team2: number }
}

/** GET /api/v1/public/matches/:matchId/maps/:mapNumber */
export interface MatchDetail {
  matchId: string
  mapNumber: number
  mapName: string
  playedAt: string | null
  winner: "team1" | "team2" | null
  teams: MatchDetailTeam[]
  rounds: MatchDetailRound[]
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

/** Play page bucket derived by the API from the server's LEGACYX_SERVER_MODE. */
export type ServerModeKind = "5v5" | "pro" | "fun" | "other"

export interface ServerInfo {
  id: string
  name: string
  map: string
  players: number
  maxPlayers: number
  mode: ServerModeKind
  /** The raw LEGACYX_SERVER_MODE, e.g. "fun_retake"; used for Fun Mode chips. */
  rawMode?: string | null
  ping: number
  status: ServerStatus
  connectAddress?: string
  gotvAddress?: string | null
  lastHeartbeatAt?: string | null
  /** From a fresh live match snapshot (≤ 90s old); null when the server reports none. */
  live?: ServerLiveState | null
}

export interface ServerLiveState {
  state: string
  round: number | null
  score: { t: number; ct: number } | null
}

export interface QuickJoinResult {
  server: ServerInfo | null
  connectAddress: string | null
}

export interface KillFeedEntry {
  cursor: number
  eventId: string
  serverId: string
  attackerName: string
  attackerSteamId: string | null
  victimName: string
  victimSteamId: string | null
  weapon: string
  headshot: boolean
  at: string
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
  /** Optional in the snapshot contract; null until the plugin reports them. */
  kills?: number | null
  deaths?: number | null
  assists?: number | null
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
  id: string
  steamId: string
  name: string
  avatar: string
  rankId?: number
  kills: number
  deaths: number
  kd: number
  matches: number
  wins: number
  winRate?: number
  playedHours: number
  lastPlayed: string | null
  moderationStatus: ModerationStatus
}

export type ModerationStatus = "Banned" | "Muted" | "Gag" | "Clear"

/* ----------------------------------------------------------------------------
 * Tournaments
 * ------------------------------------------------------------------------- */

export type TournamentPhase = "registration" | "upcoming" | "live" | "finished"

export interface TournamentSummary {
  id: string
  name: string
  description: string | null
  phase: TournamentPhase
  format: string
  prizePool: string | null
  startsAt: string | null
  registrationClosesAt: string | null
  checkInOpensAt: string | null
  maxPlayers: number | null
  teamSize: number
  registeredPlayers: number
  winner: { id: string; name: string } | null
}

export interface TournamentPlayer {
  userId: string
  steamId: string
  name: string
  avatar: string
  exp: number
  rankId: number
  checkedIn: boolean
}

export interface TournamentTeam {
  id: string
  name: string
  captainUserId: string | null
  autoBalanced: boolean
  players: TournamentPlayer[]
}

export interface TournamentMatch {
  id: string
  round: string
  order: number
  status: "live" | "upcoming" | "completed"
  map: string | null
  scheduledAt: string | null
  teamA: { id: string; name: string } | null
  teamB: { id: string; name: string } | null
  scoreA: number | null
  scoreB: number | null
  serverId: string | null
  serverName?: string | null
  connectAddress?: string | null
}

export interface TournamentDetail {
  tournament: TournamentSummary
  teams: TournamentTeam[]
  soloPlayers: TournamentPlayer[]
  matches: TournamentMatch[]
  viewer: { registered: boolean; mode: "solo" | "team" | null; teamId: string | null; checkedIn: boolean } | null
}

export interface TournamentsOverview {
  current: TournamentSummary | null
  past: TournamentSummary[]
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

export interface StaffPanelDatabaseOverview {
  tables: Array<{ name: string; count: number }>
}

export interface StaffPanelActionRequest {
  serverId: string
  type: "ban" | "kick" | "mute" | "rename" | "map_change" | "server_announcement" | "match_announcement" | "hud_announcement" | "player_message" | "restart_all" | "restart_server" | "start_server" | "stop_server" | "timeout" | "player_ip_lookup"
  playerSteamId?: string
  playerName?: string
  map?: string
  message?: string
  durationSeconds?: number
  reason?: string
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
 * Moderation / penalties
 * ------------------------------------------------------------------------- */

/** Matches the legacy_x.penalty_type enum; "comm" is a voice/communication block (shown as MUTE). */
export type PenaltyType = "ban" | "comm" | "gag"

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
  adminAvatar?: string
  /** When a temporary penalty stops applying; null for permanent ones. */
  expiresAt?: string | null
  date: string
}

export interface PenaltyStats {
  totalBans: number
  activeBans: number
  permanentBans: number
  /** Voice mutes (penalty type "comm"); the backend names the field after the enum value. */
  totalComms: number
  totalGags: number
}

export interface PenaltyFilters {
  type?: PenaltyType
  query?: string
  /** Issuing admin (name or SteamID64). */
  admin?: string
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

export interface SearchPlayersResult {
  players: CommunityPlayer[]
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

}
