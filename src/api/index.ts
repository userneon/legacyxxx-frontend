/**
 * Centralized API surface.
 *
 * Every page-level consumer imports from `@/api` instead of reaching into
 * individual service files, keeping the import graph stable when services
 * are refactored.
 */

export * from "./types"

export {
  ACCESS_TOKEN_KEY,
  get,
  post,
  put,
  patch,
  del,
  request,
  getAccessToken,
  setAccessToken,
} from "./client"
export type { QueryParams, RequestOptions, CallOptions } from "./client"

export { authService } from "./auth"
export { profileService } from "./profile"
export { playService } from "./play"
export { serversService } from "./servers"
export { playersService } from "./players"
export { clansService } from "./clans"
export { tournamentsService } from "./tournaments"
export { leaderboardService } from "./leaderboard"
export { moderationService } from "./moderation"
export { storeService } from "./store"
export { walletService } from "./wallet"
export { feedbackService } from "./feedback"
export { searchService } from "./search"
export { communityService } from "./community"
export { skinchangerService } from "./skinchanger"
export type {
  SkinchangerActiveServerSession,
  SkinchangerAppearanceOptions,
  SkinchangerCatalogFacets,
  SkinchangerCatalogItem,
  SkinchangerCatalogPage,
  SkinchangerCategory,
  SkinchangerCharmOption,
  SkinchangerFirearmGroup,
  SkinchangerJob,
  SkinchangerLoadout,
  SkinchangerLoadoutEntry,
  SkinchangerLoadoutInput,
  SkinchangerSlot,
  SkinchangerStickerOption,
  TeamScope,
} from "./skinchanger"
