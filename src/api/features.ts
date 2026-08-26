import { get, type CallOptions } from "./client"

export interface PublicFeatureFlags {
  shop: boolean
  wallet: boolean
  credits: boolean
  promoCodes: boolean
  clan: boolean
  staffPanel: boolean
}

export const DISABLED_PUBLIC_FEATURE_FLAGS: PublicFeatureFlags = {
  shop: false,
  wallet: false,
  credits: false,
  promoCodes: false,
  clan: false,
  staffPanel: false,
}

export const featuresService = {
  getPublicFlags: (options?: CallOptions) => get<{ features: PublicFeatureFlags }>("/public/features", undefined, { ...options, skipAuth: true }),
}
