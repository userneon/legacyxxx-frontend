/**
 * The picture of a craft in the Advanced studio: the ChainSkins 3D viewer (github.com/ChainSkins/cs2-3d-viewer, embed route) drawing the gun with
 * the game's own sticker and charm shaders. The craft goes to it as a CS2 inspect link (`lib/inspect-link.ts`). The viewer's chainskins.net mark
 * always shows (its embed terms); the models and textures are Valve's, served by that viewer.
 *
 * That viewer cannot move a sticker or the charm on a gun it has drawn: any change loads the whole gun again, and while it does it shows its own
 * loading. So two viewers are kept (owner request 2026-11-06, "it loads every time I move a sticker"): the one in front stays on the screen,
 * and a change is sent to the one behind. When that one says the gun is drawn (`cs3d:loaded`) the two swap places, and the next change goes to the
 * one that was in front. A moved sticker therefore shows up a moment later without the picture ever going blank. Only the first picture, and a
 * change of gun or skin, are covered by "Loading the gun…" (until the new gun is in front), and a small spinner shows while a change is on its way.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, RotateCcw } from "lucide-react"

import { cn } from "@/lib/utils"
import { inspectHex, type InspectCraft } from "@/lib/inspect-link"

export const REAL_VIEWER_ORIGIN = "https://3d.chainskins.net"
const addressOf = (hex: string) => `${REAL_VIEWER_ORIGIN}/embed?ui=0&auto_rotate=0&inspect=${hex}`
/** The first picture may take a while (models and textures come from the viewer). A change that is not answered loads the viewer behind again. */
const FIRST_LOAD_MS = 45_000
const CHANGE_ANSWER_MS = 12_000
/** A change is sent once the craft has been still for this long (a sticker being dragged is not sent at every step). */
const SETTLE_MS = 500

export function StudioRealPreview({ craft, label, skinKey }: { craft: InspectCraft; label: string; skinKey: string }) {
  const hex = inspectHex(craft)
  const latest = useRef(hex)
  latest.current = hex
  const frames = [useRef<HTMLIFrameElement>(null), useRef<HTMLIFrameElement>(null)]
  const ready = useRef([false, false])             // each viewer is up and takes messages
  const shown = useRef(["", ""])                   // the inspect link each viewer has drawn, or is drawing
  const front = useRef(0)
  const pending = useRef<number | null>(null)      // the viewer a change is on its way to
  const lastSkin = useRef(skinKey)
  const answerTimer = useRef<number | undefined>(undefined)
  const [frontIndex, setFrontIndex] = useState(0)
  const [phase, setPhase] = useState<"loading" | "ready" | "failed">("loading")
  const [busy, setBusy] = useState(false)
  const [secondMounted, setSecondMounted] = useState(false)
  const [sources, setSources] = useState<[string, string]>(() => [addressOf(hex), ""])
  const [keys, setKeys] = useState<[number, number]>([0, 0])

  /** Open a viewer from the start with the craft as it is now (the first picture, and the way back when a viewer does not answer). */
  const reopen = useCallback((index: 0 | 1) => {
    ready.current[index] = false
    shown.current[index] = latest.current
    setSources((current) => (index === 0 ? [addressOf(latest.current), current[1]] : [current[0], addressOf(latest.current)]))
    setKeys((current) => (index === 0 ? [current[0] + 1, current[1]] : [current[0], current[1] + 1]))
  }, [])

  /** Send the craft as it is now to the viewer behind, if it is ready and nothing is on its way already. */
  const send = useCallback(() => {
    const back = 1 - front.current
    if (pending.current !== null || !ready.current[back]) return
    if (latest.current === shown.current[front.current]) return
    pending.current = back
    shown.current[back] = latest.current
    setBusy(true)
    frames[back].current?.contentWindow?.postMessage({ type: "cs3d:load", target: { inspect: latest.current }, options: { auto_rotate: false } }, REAL_VIEWER_ORIGIN)
    window.clearTimeout(answerTimer.current)
    answerTimer.current = window.setTimeout(() => { reopen(back as 0 | 1) }, CHANGE_ANSWER_MS)   // no answer: load that viewer again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reopen])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== REAL_VIEWER_ORIGIN) return
      const index = event.source === frames[0].current?.contentWindow ? 0 : event.source === frames[1].current?.contentWindow ? 1 : -1
      const type = (event.data as { type?: unknown } | null)?.type
      if (index < 0 || typeof type !== "string") return
      if (type === "cs3d:ready") ready.current[index] = true
      if (type === "cs3d:loaded") {
        ready.current[index] = true
        if (pending.current === index) {
          // The gun behind is drawn: bring it to the front.
          window.clearTimeout(answerTimer.current)
          pending.current = null
          front.current = index
          setFrontIndex(index)
          setBusy(false)
          setPhase("ready")
        } else if (index === front.current) {
          setPhase("ready")
          setSecondMounted((already) => { if (!already) { shown.current[1] = latest.current; setSources((current) => [current[0], addressOf(latest.current)]) } return true })
        }
        window.setTimeout(send, 0)   // a change made meanwhile goes out now
      }
      if (type === "cs3d:error") {
        window.clearTimeout(answerTimer.current)
        if (pending.current === index) { pending.current = null; setBusy(false) }
        else if (index === front.current) setPhase((current) => (current === "loading" ? "failed" : current))
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [send])

  // The first picture: give up after a while and say so, with a way to try again.
  useEffect(() => {
    if (phase !== "loading" || !ready.current) return
    const timer = window.setTimeout(() => setPhase((current) => (current === "loading" && pending.current === null && !ready.current[front.current] ? "failed" : current)), FIRST_LOAD_MS)
    return () => window.clearTimeout(timer)
  }, [phase, keys])

  // The craft changed: once it has been still for a moment it goes to the viewer behind. A different gun or skin is covered until it is in front.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (lastSkin.current !== skinKey) { lastSkin.current = skinKey; setPhase("loading") }
      send()
    }, SETTLE_MS)
    return () => window.clearTimeout(timer)
  }, [hex, skinKey, send])
  useEffect(() => () => window.clearTimeout(answerTimer.current), [])

  const retry = () => {
    pending.current = null
    front.current = 0
    setFrontIndex(0)
    setPhase("loading")
    setBusy(false)
    setSecondMounted(false)
    setSources([addressOf(latest.current), ""])
    ready.current = [false, false]
    shown.current = [latest.current, ""]
    setKeys((current) => [current[0] + 1, current[1] + 1])
  }

  return (
    <div className="absolute inset-0">
      {[0, 1].map((index) => (index === 1 && !secondMounted ? null : (
        <iframe
          key={`${index}:${keys[index]}`}
          ref={frames[index]}
          title={`${label} in the real 3D viewer${index === frontIndex ? "" : " (loading the next picture)"}`}
          src={sources[index]}
          referrerPolicy="no-referrer"
          allow="fullscreen"
          sandbox="allow-scripts allow-same-origin"
          aria-hidden={index !== frontIndex}
          tabIndex={index === frontIndex ? 0 : -1}
          className={cn("absolute inset-0 size-full border-0", index === frontIndex ? "z-[1]" : "pointer-events-none z-0 opacity-0")}
        />
      )))}
      {phase === "loading" && (
        <div role="status" aria-label="Loading" className="absolute inset-0 z-[2] grid place-items-center bg-[var(--card-surface)]">
          <span className="flex items-center gap-2 text-[13px] text-[var(--text-dim)]"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading the gun…</span>
        </div>
      )}
      {phase === "failed" && (
        <div className="absolute inset-0 z-[2] grid place-items-center bg-[var(--card-surface)]">
          <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">The preview did not load.<button type="button" onClick={retry} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-4" aria-hidden="true" />Retry</button></p>
        </div>
      )}
      {phase === "ready" && busy && <Loader2 role="status" aria-label="Updating" className="absolute bottom-3 left-3 z-[2] size-4 animate-spin text-[var(--text-dim)]" />}
    </div>
  )
}
