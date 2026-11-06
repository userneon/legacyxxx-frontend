/**
 * The picture of a craft in the Advanced studio: the ChainSkins 3D viewer (github.com/ChainSkins/cs2-3d-viewer, embed route) drawing the gun with
 * the game's own sticker and charm shaders. The craft goes to it as a CS2 inspect link (`lib/inspect-link.ts`), first in the address and after that
 * by message (`cs3d:load`), so a moved sticker does not reload the whole viewer. The viewer's chainskins.net mark always shows (its embed terms);
 * the models and textures are Valve's, served by that viewer.
 *
 * Loading: until the viewer says the gun is drawn (`cs3d:loaded`) a "Loading" cover hides it, so a half-made gun is never seen. When the gun or
 * the skin changes the cover comes back; for a smaller change (a sticker moved) the old picture stays and a small spinner shows until the new one is in.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, RotateCcw } from "lucide-react"

import { inspectHex, type InspectCraft } from "@/lib/inspect-link"

export const REAL_VIEWER_ORIGIN = "https://3d.chainskins.net"
/** The first picture may take a while (models and textures come from the viewer); a later change that gets no answer reloads the viewer. */
const FIRST_LOAD_MS = 45_000
const CHANGE_ANSWER_MS = 8_000

export function StudioRealPreview({ craft, label, skinKey }: { craft: InspectCraft; label: string; skinKey: string }) {
  const hex = inspectHex(craft)
  const frame = useRef<HTMLIFrameElement>(null)
  const latest = useRef(hex)
  const shown = useRef("")                       // the inspect link the viewer has drawn, or is drawing
  const lastSkin = useRef(skinKey)
  const ready = useRef(false)                    // the viewer is up and takes messages
  const changeTimer = useRef<number | undefined>(undefined)
  const [attempt, setAttempt] = useState(0)
  const [phase, setPhase] = useState<"loading" | "ready" | "failed">("loading")
  const [busy, setBusy] = useState(false)
  latest.current = hex

  // The address the viewer opens with: whatever the craft is when it (re)starts. Later changes go by message.
  const [src, setSrc] = useState(() => `${REAL_VIEWER_ORIGIN}/embed?ui=0&auto_rotate=0&inspect=${hex}`)
  const restart = useCallback(() => {
    ready.current = false
    shown.current = latest.current
    lastSkin.current = skinKey
    setPhase("loading")
    setBusy(false)
    setSrc(`${REAL_VIEWER_ORIGIN}/embed?ui=0&auto_rotate=0&inspect=${latest.current}`)
    setAttempt((value) => value + 1)
  }, [skinKey])
  useEffect(() => { shown.current = hex }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // What the viewer tells us.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== REAL_VIEWER_ORIGIN || event.source !== frame.current?.contentWindow) return
      const type = (event.data as { type?: unknown } | null)?.type
      if (typeof type !== "string") return
      if (type === "cs3d:ready") ready.current = true
      if (type === "cs3d:loaded") {
        ready.current = true
        window.clearTimeout(changeTimer.current)
        setPhase("ready")
        setBusy(false)
      }
      if (type === "cs3d:error") {
        window.clearTimeout(changeTimer.current)
        setBusy(false)
        setPhase((current) => (current === "loading" ? "failed" : current))
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  // The first picture: give up after a while and say so, with a way to try again.
  useEffect(() => {
    if (phase !== "loading") return
    const timer = window.setTimeout(() => setPhase((current) => (current === "loading" ? "failed" : current)), FIRST_LOAD_MS)
    return () => window.clearTimeout(timer)
  }, [phase, attempt])

  // The craft changed: send the new inspect link once it has settled for a moment.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (hex === shown.current) return
      if (!ready.current || phase !== "ready") return   // the viewer is still on its first picture; it is sent when that is in
      const skinChanged = lastSkin.current !== skinKey
      lastSkin.current = skinKey
      shown.current = hex
      if (skinChanged) setPhase("loading"); else setBusy(true)
      frame.current?.contentWindow?.postMessage({ type: "cs3d:load", target: { inspect: hex }, options: { auto_rotate: false } }, REAL_VIEWER_ORIGIN)
      // No answer (the viewer did not take the message): start it again with the new craft.
      window.clearTimeout(changeTimer.current)
      changeTimer.current = window.setTimeout(restart, CHANGE_ANSWER_MS)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [hex, skinKey, phase, restart])
  useEffect(() => () => window.clearTimeout(changeTimer.current), [])

  return (
    <div className="absolute inset-0">
      <iframe
        key={attempt}
        ref={frame}
        title={`${label} in the real 3D viewer`}
        src={src}
        referrerPolicy="no-referrer"
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin"
        className="size-full border-0"
      />
      {phase === "loading" && (
        <div role="status" aria-label="Loading" className="absolute inset-0 grid place-items-center bg-[var(--card-surface)]">
          <span className="flex items-center gap-2 text-[13px] text-[var(--text-dim)]"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading the gun…</span>
        </div>
      )}
      {phase === "failed" && (
        <div className="absolute inset-0 grid place-items-center bg-[var(--card-surface)]">
          <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">The preview did not load.<button type="button" onClick={restart} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-4" aria-hidden="true" />Retry</button></p>
        </div>
      )}
      {phase === "ready" && busy && <Loader2 role="status" aria-label="Updating" className="absolute bottom-3 left-3 size-4 animate-spin text-[var(--text-dim)]" />}
    </div>
  )
}
