import { DISABLED_PUBLIC_FEATURE_FLAGS, featuresService, type PublicFeatureFlags } from "@/api/features"
import { useApiQuery } from "@/hooks/use-api-query"

/** Launch controls are fail-closed in the browser: network/API failure leaves every deferred feature hidden. */
export function useFeatureFlags() {
  const query = useApiQuery<PublicFeatureFlags>(async (signal) => {
    const response = await featuresService.getPublicFlags({ signal })
    return response.features
  }, { queryKey: "public-feature-flags" })

  return { ...query, flags: query.data ?? DISABLED_PUBLIC_FEATURE_FLAGS }
}
