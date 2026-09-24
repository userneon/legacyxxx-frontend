import { useCallback, useEffect, useRef, useState } from "react"

import { killFeedService } from "@/api"
import type { KillFeedEntry } from "@/api/types"
import { cn } from "@/lib/utils"
import { killFeedTags, killFeedWeaponIcon } from "@/lib/killfeed-icons"

const MAX_ENTRIES = 30
const POLL_MS = 5_000
/** With no kill in this long the feed says so instead of looping stale names. */
const STALE_MS = 10 * 60 * 1000

/** Motion always runs in full on Legacy-X (no reduced-motion mode). */
const prefersReducedMotion = () => false

/** The artwork is a black silhouette, so it is flipped to the panel's own light tone. */
const ICON_FILTER = { filter: "brightness(0) invert(1)" } as const

function Tag({ src, label, className }: { src: string; label: string; className?: string }) {
  return <img src={src} alt={label} title={label} style={ICON_FILTER} className={cn("size-3.5 shrink-0 object-contain opacity-60", className)} />
}

function Entry({ kill }: { kill: KillFeedEntry }) {
  const weaponIcon = killFeedWeaponIcon(kill.weapon)
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="font-medium text-[var(--text)]" title={kill.attackerName}>{kill.attackerName}</span>
      {kill.blind && <Tag src={killFeedTags.blind} label="blinded" />}
      {kill.throughSmoke && <Tag src={killFeedTags.smoke} label="through smoke" />}
      {kill.noscope && <Tag src={killFeedTags.noscope} label="no-scope" />}
      {weaponIcon
        ? <img src={weaponIcon} alt={kill.weapon} title={kill.weapon} style={ICON_FILTER} className="h-4 w-auto max-w-12 shrink-0 object-contain opacity-70" />
        : <span className="text-xs text-[var(--text-dim)]" title={kill.weapon}>{kill.weapon}</span>}
      {kill.penetrated && <Tag src={killFeedTags.wallbang} label="through wall" />}
      {kill.headshot && <Tag src={killFeedTags.headshot} label="headshot" className="opacity-80" />}
      <span className="text-[var(--text-2)]" title={kill.victimName}>{kill.victimName}</span>
    </span>
  )
}

/** LIVE label plus a right-to-left ticker of the latest kills; hover pauses it, a click opens that server. */
export function KillFeed({ onOpenServer }: { onOpenServer?: (serverId: string) => void }) {
  const [kills, setKills] = useState<KillFeedEntry[]>([])
  const cursor = useRef<string | null>(null)
  const reduced = prefersReducedMotion()

  const poll = useCallback(async () => {
    try {
      const page = await killFeedService.getKills(cursor.current)
      if (page.cursor) cursor.current = page.cursor
      if (page.kills.length === 0) return
      setKills((current) => {
        const seen = new Set(current.map((kill) => kill.eventId))
        const fresh = page.kills.filter((kill) => !seen.has(kill.eventId))
        return [...current, ...fresh].slice(-MAX_ENTRIES)
      })
    } catch {
      // A missing or failing feed just leaves the ticker as it is.
    }
  }, [])

  useEffect(() => {
    void poll()
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void poll() }, POLL_MS)
    const onVisible = () => { if (document.visibilityState === "visible") void poll() }
    document.addEventListener("visibilitychange", onVisible)
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible) }
  }, [poll])

  const latest = kills[kills.length - 1]
  const stale = !latest || Date.now() - new Date(latest.timestamp).getTime() > STALE_MS
  const shown = reduced ? kills.slice(-5) : kills

  return (
    <div aria-label="Live kill feed" className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
        <span className="size-1.5 rounded-full bg-[var(--status-green)]" />
        LIVE
      </span>
      {stale ? (
        <span className="truncate text-[13px] text-[var(--text-dim)]">No live matches right now</span>
      ) : (
        <div className="kill-feed min-w-0 flex-1 overflow-hidden">
          <div className={cn("inline-flex gap-5 pr-5 text-[13px]", !reduced && "kill-feed-track")}>
            {[...shown, ...(reduced ? [] : shown)].map((kill, index) => (
              <button
                key={`${kill.eventId}-${index}`}
                type="button"
                onClick={() => onOpenServer?.(kill.serverId)}
                aria-hidden={index >= shown.length}
                tabIndex={index >= shown.length ? -1 : 0}
                className="inline-flex items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"
              >
                <Entry kill={kill} />
                <span aria-hidden="true" className="text-[var(--text-faint)]">·</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
