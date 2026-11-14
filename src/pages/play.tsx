import { PlayStrip } from "@/components/play-strip"
import { PlayQueue } from "@/components/play-queue"
import type { PlaySubMode } from "@/api/types"

/**
 * Play (owner decision 2026-11-14: "5x5 and Pro League are not separate, only one queue"): one matchmaking page, one queue for every player.
 * The old 5x5 / Pro League split, the Pro rank lock and the server list are gone.
 */
export function PlayPage(_props: { mode?: Exclude<PlaySubMode, "tournaments"> }) {
  return (
    <div className="lx-swap-in flex min-h-0 flex-1 flex-col gap-6 bg-black p-6 @container">
      <PlayStrip />
      <PlayQueue mode="5x5" />
    </div>
  )
}
