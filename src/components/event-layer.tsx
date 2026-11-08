import { useEffect } from "react"

import { useActiveEvent } from "@/hooks/use-active-event"

/**
 * The holiday look of the website (owner request 2026-11-08): while an event runs, `<html data-event="...">` carries its name (event-themes.css reads it)
 * and a few slow flecks drift over the page. Soft on purpose: the layout, the buttons and the palette of the pages stay as they are. Still for reduced motion.
 */
export function EventLayer() {
  const event = useActiveEvent()
  const theme = event?.theme ?? null
  useEffect(() => {
    const root = document.documentElement
    if (theme) root.dataset.event = theme
    else delete root.dataset.event
    return () => { delete root.dataset.event }
  }, [theme])
  if (!theme) return null
  return (
    <div aria-hidden="true" className="lx-event-layer pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      {Array.from({ length: 16 }, (_, index) => <span key={index} className="lx-event-fleck" style={{ "--i": index } as React.CSSProperties} />)}
    </div>
  )
}
