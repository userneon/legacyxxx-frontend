import { KillFeedChips } from "@/components/kill-feed-chips"
import { KillFeedClassic } from "@/components/kill-feed-classic"
import { isFeatureEnabled } from "@/lib/features"

/** The top bar's live kills: game-style chips on dev servers (and with VITE_FEATURE_KILL_CHIPS=1), the scrolling ticker otherwise. */
export function KillFeed({ onOpenServer }: { onOpenServer?: (serverId: string) => void }) {
  return isFeatureEnabled("killChips") ? <KillFeedChips onOpenServer={onOpenServer} /> : <KillFeedClassic onOpenServer={onOpenServer} />
}
