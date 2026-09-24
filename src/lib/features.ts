/**
 * Feature switches for the first release. A feature that is `false` is invisible: its navigation entries,
 * buttons, cards and routes are not rendered at all — no placeholder, no "coming soon".
 */
export const FEATURES = {
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
