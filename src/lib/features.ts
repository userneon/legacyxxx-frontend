import type { PageId } from "@/api/types"

/**
 * Feature switches for the first release.
 *
 * A feature that is `false` is invisible: its navigation entries, buttons, cards and routes are not
 * rendered at all — no placeholder, no "coming soon". Turning one back on is a single edit here; the
 * code that belongs to it stays in the repo and re-appears wherever `isFeatureEnabled` guards it.
 */
export const FEATURES = {
  /** Clans: clan pages, clan search, clan badges on profiles. The server also needs CLAN_ENABLED=true. */
  clan: true,
  /** Live server roster dialog (who is on a server right now). Temporarily off. */
  roster: false,
  skinchanger: true,
  penalties: true,
  leaders: true,
  explore: true,
  feedback: true,
  tournaments: true,
  /** The Grid Scan as the page backdrop while a profile is open. Shown on every dev server, or with VITE_FEATURE_PROFILE_GRID=1. */
  profileGrid: import.meta.env.DEV || import.meta.env.VITE_FEATURE_PROFILE_GRID === "1",
  /** Community skin collections on the Skinchanger page. The server needs the skin_collections migration and a deploy. */
  skinCollections: true,
  /** Two players side by side. */
  compare: true,
} as const

export type FeatureName = keyof typeof FEATURES

export function isFeatureEnabled(feature: FeatureName): boolean {
  return FEATURES[feature]
}

/** Pages that belong to a feature switch. Pages absent from this map are always available. */
const PAGE_FEATURES: Partial<Record<PageId, FeatureName>> = {
  clan: "clan",
  skinchanger: "skinchanger",
  compare: "compare",
  penalties: "penalties",
  leaders: "leaders",
  explore: "explore",
  feedback: "feedback",
  "play-tournaments": "tournaments",
}

export function isPageEnabled(page: PageId): boolean {
  const feature = PAGE_FEATURES[page]
  return feature === undefined || isFeatureEnabled(feature)
}
