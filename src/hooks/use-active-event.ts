import { useEffect, useState } from "react"

import { eventsService, type ActiveEvent } from "@/api/events"
import { knownEventTheme } from "@/lib/site-events"

const REFRESH_MS = 30 * 60 * 1000

/** The holiday that runs today (null when none, while loading, or when the API cannot say): asked once and then every half hour, so a tab left open changes by itself. */
export function useActiveEvent(): ActiveEvent | null {
  const [event, setEvent] = useState<ActiveEvent | null>(null)
  useEffect(() => {
    let alive = true
    const load = () => {
      eventsService.active().then(
        (next) => { if (alive) setEvent(next && knownEventTheme(next.theme) ? next : null) },
        () => { /* a failed ask keeps what is on screen */ },
      )
    }
    load()
    const timer = window.setInterval(load, REFRESH_MS)
    return () => { alive = false; window.clearInterval(timer) }
  }, [])
  return event
}
