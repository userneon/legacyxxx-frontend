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
export { serversService } from "./servers"
export { tournamentsService } from "./tournaments"
export { killfeedService } from "./killfeed"
export { moderationService } from "./moderation"
export { notificationsService } from "./notifications"
export type { NotificationEntry, NotificationFeed, NotificationKind } from "./notifications"
export { feedbackService } from "./feedback"
export { searchService } from "./search"
export { communityService } from "./community"
export { competitiveService } from "./competitive"
export { skinchangerService } from "./skinchanger"
export type {
  SkinchangerAppearanceOptions,
  SkinchangerCatalogFacets,
  SkinchangerCatalogItem,
  SkinchangerCatalogPage,
  SkinchangerCategory,
  SkinchangerCharmOption,
  SkinchangerFirearmGroup,
  SkinchangerLoadout,
  SkinchangerLoadoutEntry,
  SkinchangerLoadoutInput,
  SkinchangerSlot,
  SkinchangerStickerOption,
  TeamScope,
} from "./skinchanger"
