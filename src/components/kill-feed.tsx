/**
 * Top bar kill feed (docs/design/PROMPT.md §6). Kills come from the API's in-memory feed; the ticker keeps
 * running while new entries are appended, so it never restarts or jumps on refresh.
 */
import { Fragment, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Crosshair } from "lucide-react"

import { killfeedService, type KillFeedEntry } from "@/api"
import { cn } from "@/lib/utils"
import { prefersReducedMotion, useWebsitePrefs } from "@/lib/website-prefs"
import { useIsMobile } from "@/hooks/use-mobile"
import { useLiveServers } from "@/hooks/use-live-servers"

const PLAY_ROUTE_BY_MODE: Record<string, string> = { "5v5": "/play/5x5", fun: "/play/fun", pro: "/play/pro" }

const POLL_MS = 5_000
const MAX_ENTRIES = 30
const QUIET_AFTER_MS = 10 * 60_000

function useKillFeed() {
  const [entries, setEntries] = useState<KillFeedEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const cursorRef = useRef(0)

  useEffect(() => {
    let timer: number | undefined
    let controller: AbortController | undefined
    const poll = async () => {
      controller = new AbortController()
      try {
        const next = await killfeedService.since(cursorRef.current, { signal: controller.signal })
        cursorRef.current = next.cursor
        if (next.entries.length > 0) setEntries((current) => [...current, ...next.entries].slice(-MAX_ENTRIES))
      } catch {
        /* A missed poll just waits for the next one. */
      } finally {
        setLoaded(true)
      }
    }
    const schedule = () => {
      window.clearInterval(timer)
      if (document.visibilityState !== "visible") return
      void poll()
      timer = window.setInterval(() => void poll(), POLL_MS)
    }
    schedule()
    document.addEventListener("visibilitychange", schedule)
    return () => {
      window.clearInterval(timer)
      controller?.abort()
      document.removeEventListener("visibilitychange", schedule)
    }
  }, [])

  return { entries, loaded }
}

function Kill({ entry, onOpen }: { entry: KillFeedEntry; onOpen: (serverId: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(entry.serverId)}
      className="inline-flex max-w-[26rem] shrink-0 items-center gap-2 whitespace-nowrap text-[13px] transition-opacity duration-150 hover:opacity-80"
      title={`${entry.attackerName} killed ${entry.victimName} with ${entry.weapon}${entry.headshot ? " (headshot)" : ""}`}
    >
      <span className="truncate font-medium text-text">{entry.attackerName}</span>
      <span className="text-xs text-text-dim">{entry.weapon}</span>
      {entry.headshot && <Crosshair className="size-3.5 shrink-0 text-text-muted" aria-label="Headshot" />}
      <span className="truncate text-text-2">{entry.victimName}</span>
    </button>
  )
}

export function KillFeed() {
  const { killFeed } = useWebsitePrefs()
  const { entries, loaded } = useKillFeed()
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { servers } = useLiveServers()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  if (!killFeed) return <div className="min-w-0 flex-1" />

  const latest = entries.at(-1)
  const quiet = !latest || now - Date.parse(latest.at) > QUIET_AFTER_MS
  const openServer = (serverId: string) => {
    const mode = servers.find((server) => server.id === serverId)?.mode
    navigate(`${PLAY_ROUTE_BY_MODE[mode ?? "5v5"] ?? "/play/5x5"}?server=${encodeURIComponent(serverId)}`)
  }
  const reduced = prefersReducedMotion()

  return (
    <div aria-label="Live kill feed" className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-text-muted">
        <span className={cn("size-1.5 rounded-full", quiet ? "bg-text-faint" : "bg-live")} aria-hidden />
        LIVE
      </span>
      {!loaded ? null : quiet ? (
        <span className="truncate text-[13px] text-text-dim animate-fade-in">No live matches right now</span>
      ) : isMobile ? (
        <div className="min-w-0 flex-1 overflow-hidden">
          <Kill entry={latest} onOpen={openServer} />
        </div>
      ) : reduced ? (
        <div className="flex min-w-0 flex-1 items-center gap-5 overflow-hidden mask-fade-x">
          {entries.slice(-5).map((entry, index) => (
            <Fragment key={entry.eventId}>
              {index > 0 && <span className="text-text-faint" aria-hidden>·</span>}
              <Kill entry={entry} onOpen={openServer} />
            </Fragment>
          ))}
        </div>
      ) : (
        <div className="ticker min-w-0 flex-1 overflow-hidden mask-fade-x">
          <div className="ticker-track inline-flex items-center gap-5 pr-5">
            {[0, 1].map((copy) => (
              <Fragment key={copy}>
                {entries.map((entry) => (
                  <Fragment key={`${copy}-${entry.eventId}`}>
                    <span aria-hidden={copy === 1 || undefined} inert={copy === 1 || undefined} className="inline-flex items-center gap-5 animate-fade-in">
                      <Kill entry={entry} onOpen={openServer} />
                      <span className="text-text-faint" aria-hidden>·</span>
                    </span>
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
