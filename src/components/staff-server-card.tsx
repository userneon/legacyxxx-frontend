import { Users } from "lucide-react"

import type { StaffPanelServer } from "@/api/types"
import { STAFF_CARD } from "@/components/staff-ui"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { cn } from "@/lib/utils"

/** A server that reported in the last two minutes counts as online. */
export function serverOnline(lastHeartbeat: string | null) {
  return Boolean(lastHeartbeat) && Date.now() - Date.parse(lastHeartbeat as string) < 120_000
}

/** A game server as a card: its map's picture along the top, the name, mode, players and whether it is reporting. */
export function ServerMapCard({ server, picked, onPick }: { server: StaffPanelServer; picked?: boolean; onPick?: () => void }) {
  const online = serverOnline(server.last_heartbeat_at)
  const art = cs2MapArtwork(server.map_name)
  const body = (
    <>
      <span className="relative block h-24 w-full overflow-hidden rounded-t-[inherit] bg-[var(--raised)]">
        {art && <img src={art} alt="" loading="lazy" draggable={false} className={cn("size-full object-cover transition-[filter] duration-300", online ? "" : "grayscale brightness-75")} />}
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--card-surface)] via-transparent to-transparent" />
        <span className="lx-tone-text absolute right-3 top-3 inline-flex h-6 items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--tone)_45%,transparent)] bg-[var(--card-surface)]/85 px-2.5 text-[11px] font-semibold"><span aria-hidden="true" className="lx-tone-fill size-1.5 rounded-full" />{online ? "online" : "not reporting"}</span>
      </span>
      <span className="flex flex-col gap-2 px-4 pb-4 pt-1">
        <span className="truncate text-[15px] font-semibold text-[var(--text)]" title={server.name || server.server_id}>{server.name || server.server_id}</span>
        <span className="flex items-center justify-between gap-2 text-xs text-[var(--text-dim)]">
          <span className="truncate">{cs2MapLabel(server.map_name)} · {server.mode}</span>
          <span className="inline-flex shrink-0 items-center gap-1 text-[var(--text-2)]"><Users className="size-3.5" aria-hidden="true" />{server.player_count}</span>
        </span>
      </span>
    </>
  )
  const cls = cn(STAFF_CARD, "gap-0 overflow-hidden p-0 text-left", picked && "border-[var(--text-2)]")
  return onPick ? (
    <button type="button" role="radio" aria-checked={picked} data-tone={online ? "green" : "red"} onClick={onPick} className={cn(cls, "h-full w-full")}>{body}</button>
  ) : (
    <div data-tone={online ? "green" : "red"} className={cls}>{body}</div>
  )
}
