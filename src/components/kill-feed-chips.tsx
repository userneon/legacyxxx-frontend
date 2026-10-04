import { useCallback, useEffect, useRef, useState } from "react"

import { killFeedService } from "@/api"
import type { KillFeedEntry } from "@/api/types"
import { useFlip } from "@/hooks/use-flip"
import { cn } from "@/lib/utils"
import { killFeedTags, killFeedWeaponIcon } from "@/lib/killfeed-icons"

/** How many kills the strip keeps; the ones that do not fit are clipped. */
const SHOWN = 8
const KEPT = 30
const POLL_MS = 5_000
/** With no kill in this long the feed says so instead of showing stale names. */
const STALE_MS = 10 * 60 * 1000

/** The artwork is a black silhouette, so it is flipped to the panel's own light tone. */
const ICON_FILTER = { filter: "brightness(0) invert(1)" } as const

function Tag({ src, label, className }: { src: string; label: string; className?: string }) {
  return <img src={src} alt={label} title={label} style={ICON_FILTER} className={cn("size-3.5 shrink-0 object-contain opacity-60", className)} />
}

/** One kill drawn like the game's own kill feed: a small dark chip, killer, weapon, tags, victim. */
function Chip({ kill, fresh, onOpen }: { kill: KillFeedEntry; fresh: boolean; onOpen?: () => void }) {
  const weaponIcon = killFeedWeaponIcon(kill.weapon)
  return (
    <button
      type="button"
      data-flip={kill.eventId}
      onClick={onOpen}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-[var(--line)] bg-black/40 px-2.5 text-[13px]",
        "transition-colors duration-200 hover:border-[var(--line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60",
        fresh && "lx-feed-in",
      )}
    >
      <span className="font-semibold text-[var(--text)]" title={kill.attackerName}>{kill.attackerName}</span>
      {kill.blind && <Tag src={killFeedTags.blind} label="blinded" />}
      {kill.throughSmoke && <Tag src={killFeedTags.smoke} label="through smoke" />}
      {kill.noscope && <Tag src={killFeedTags.noscope} label="no-scope" />}
      {weaponIcon
        ? <img src={weaponIcon} alt={kill.weapon} title={kill.weapon} style={ICON_FILTER} className="h-4 w-auto max-w-12 shrink-0 object-contain opacity-80" />
        : <span className="text-xs text-[var(--text-dim)]" title={kill.weapon}>{kill.weapon}</span>}
      {kill.penetrated && <Tag src={killFeedTags.wallbang} label="through wall" />}
      {kill.headshot && <Tag src={killFeedTags.headshot} label="headshot" className="opacity-90" />}
      <span className="text-[var(--text-2)]" title={kill.victimName}>{kill.victimName}</span>
    </button>
  )
}

/**
 * LIVE label and the latest kills as game-style chips, newest first. A new kill slides in from the left and the others
 * glide along; a click on a chip opens that server.
 */
export function KillFeedChips({ onOpenServer }: { onOpenServer?: (serverId: string) => void }) {
  const [kills, setKills] = useState<KillFeedEntry[]>([])
  const cursor = useRef<string | null>(null)
  /** Kills that were already there on the first load do not animate in; only later ones do. */
  const firstLoad = useRef<Set<string> | null>(null)

  const poll = useCallback(async () => {
    try {
      const page = await killFeedService.getKills(cursor.current)
      if (page.cursor) cursor.current = page.cursor
      if (page.kills.length === 0) return
      if (firstLoad.current === null) firstLoad.current = new Set(page.kills.map((kill) => kill.eventId))
      setKills((current) => {
        const seen = new Set(current.map((kill) => kill.eventId))
        const fresh = page.kills.filter((kill) => !seen.has(kill.eventId))
        return [...current, ...fresh].slice(-KEPT)
      })
    } catch {
      // A missing or failing feed just leaves the strip as it is.
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
  const shown = kills.slice(-SHOWN).reverse()
  const listRef = useFlip<HTMLDivElement>(shown.map((kill) => kill.eventId).join(","), "x")

  return (
    <div aria-label="Live kill feed" className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
        <span className={cn("size-1.5 rounded-full", stale ? "bg-[var(--text-faint)]" : "lx-live-dot bg-[var(--status-green)]")} />
        LIVE
      </span>
      {stale ? (
        <span className="truncate text-[13px] text-[var(--text-dim)]">No live matches right now</span>
      ) : (
        <div ref={listRef} className="lx-feed-strip flex min-w-0 flex-1 items-center gap-2 overflow-hidden py-1">
          {shown.map((kill) => (
            <Chip key={kill.eventId} kill={kill} fresh={!firstLoad.current?.has(kill.eventId)} onOpen={() => onOpenServer?.(kill.serverId)} />
          ))}
        </div>
      )}
    </div>
  )
}
