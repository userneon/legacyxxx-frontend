import type { PageId } from "@/api/types"

/**
 * Feature switches for the first release.
 *
 * A feature that is `false` is invisible: its navigation entries, buttons, cards and routes are not
 * rendered at all — no placeholder, no "coming soon". Turning one back on is a single edit here; the
 * code that belongs to it stays in the repo and re-appears wherever `isFeatureEnabled` guards it.
 */
export const FEATURES = {
  /** Item store. Off until the store backend is live. */
  shop: false,
  /** Balance / top-up. Off until the wallet backend is live. */
  wallet: false,
  /** Clans: clan pages, clan search, clan badges on profiles. Off until the clan backend is live. */
  clan: false,
  /** Live server roster dialog (who is on a server right now). Temporarily off. */
  roster: false,
  skinchanger: true,
  penalties: true,
  leaders: true,
  explore: true,
  feedback: true,
  tournaments: true,
} as const

export type FeatureName = keyof typeof FEATURES

export function isFeatureEnabled(feature: FeatureName): boolean {
  return FEATURES[feature]
}

/** Pages that belong to a feature switch. Pages absent from this map are always available. */
const PAGE_FEATURES: Partial<Record<PageId, FeatureName>> = {
  shop: "shop",
  wallet: "wallet",
  clan: "clan",
  skinchanger: "skinchanger",
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
