/**
 * A button with a lit fuse: pressing it starts a short countdown shown as a line burning down the button's outline, and the
 * whole button turns into "Undo" until the fuse runs out. Used where a mistaken press is easy and costly (Sign out).
 *
 * commitOn "press": onCommit runs at once and the fuse is only the time left to undo it.
 * commitOn "fuseEnd": nothing happens until the fuse is gone; Undo cancels it. onFuseEnd runs when the fuse ends either way.
 * Leaving the page (unmounting) while the fuse burns counts as Undo.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"

import { cn } from "@/lib/utils"

type Phase = "idle" | "armed" | "done"

const HEIGHTS = { sm: 32, md: 40, lg: 48 } as const

export interface FuseButtonProps {
  label: ReactNode
  /** Shown once the fuse has gone out. */
  doneLabel: ReactNode
  /** What the whole button says while the fuse burns; pressing it cancels. */
  undoLabel?: ReactNode
  /** Small leading icon while the fuse burns. */
  undoIcon?: ReactNode
  /** Small leading icon in the resting state. */
  icon?: ReactNode
  color?: string
  background?: string
  fuseColor?: string
  size?: keyof typeof HEIGHTS
  radius?: number
  /** How long the fuse burns, in ms. */
  undoWindow?: number
  fuse?: "outline"
  fuseThickness?: number
  crossfadeMs?: number
  commitOn?: "press" | "fuseEnd"
  pauseOnHover?: boolean
  /** reset: go back to the resting state after the fuse; stay: keep showing doneLabel. */
  settle?: "reset" | "stay"
  onCommit?: () => void
  onUndo?: () => void
  onFuseEnd?: () => void
  className?: string
}

export function FuseButton({
  label,
  doneLabel,
  undoLabel = "Undo",
  undoIcon,
  icon,
  color = "var(--text-muted)",
  background = "transparent",
  fuseColor = "var(--text)",
  size = "md",
  radius = 10,
  undoWindow = 4000,
  fuse = "outline",
  fuseThickness = 1.5,
  crossfadeMs = 200,
  commitOn = "press",
  pauseOnHover = false,
  settle = "reset",
  onCommit,
  onUndo,
  onFuseEnd,
  className,
}: FuseButtonProps) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [hovered, setHovered] = useState(false)
  const armed = useRef(false)
  const callbacks = useRef({ onCommit, onUndo, onFuseEnd })
  callbacks.current = { onCommit, onUndo, onFuseEnd }
  const height = HEIGHTS[size]

  // Walking away with the fuse lit is the same as pressing Undo.
  useEffect(() => () => { if (armed.current && commitOn === "press") callbacks.current.onUndo?.() }, [commitOn])
  useEffect(() => {
    if (phase !== "done" || settle !== "reset") return
    const timer = window.setTimeout(() => setPhase("idle"), 900)
    return () => window.clearTimeout(timer)
  }, [phase, settle])

  const press = () => {
    if (phase === "idle") {
      armed.current = true
      setPhase("armed")
      if (commitOn === "press") callbacks.current.onCommit?.()
    } else if (phase === "armed") {
      armed.current = false
      setPhase("idle")
      callbacks.current.onUndo?.()
    }
  }
  const fuseEnded = () => {
    armed.current = false
    setPhase("done")
    if (commitOn === "fuseEnd") callbacks.current.onCommit?.()
    callbacks.current.onFuseEnd?.()
  }

  const fade = (visible: boolean): CSSProperties => ({ opacity: visible ? 1 : 0, transition: `opacity ${crossfadeMs}ms ease`, pointerEvents: "none" })
  const inset = fuseThickness / 2

  return (
    <button
      type="button"
      role="menuitem"
      disabled={phase === "done"}
      onClick={press}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-live="polite"
      className={cn("relative grid h-10 w-full place-items-center overflow-hidden px-2.5 text-sm font-medium outline-none transition-colors hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 disabled:cursor-default", className)}
      style={{ height, color, background, borderRadius: radius }}
    >
      <span className="col-start-1 row-start-1 flex items-center gap-2.5 justify-self-start" style={fade(phase === "idle")}>{icon}{label}</span>
      <span className="col-start-1 row-start-1 flex items-center gap-2.5 justify-self-start font-semibold text-[var(--text)]" style={fade(phase === "armed")}>{undoIcon}{undoLabel}</span>
      <span className="col-start-1 row-start-1 flex items-center gap-2.5 justify-self-start" style={fade(phase === "done")}>{doneLabel}</span>
      {fuse === "outline" && phase === "armed" && (
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible" width="100%" height="100%">
          <rect
            x={inset}
            y={inset}
            width={`calc(100% - ${fuseThickness}px)`}
            height={`calc(100% - ${fuseThickness}px)`}
            rx={Math.max(0, radius - inset)}
            fill="none"
            stroke={fuseColor}
            strokeWidth={fuseThickness}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1 1"
            style={{
              filter: `drop-shadow(0 0 3px ${fuseColor})`,
              animation: `lx-fuse-burn ${undoWindow}ms linear forwards`,
              animationPlayState: pauseOnHover && hovered ? "paused" : "running",
            }}
            onAnimationEnd={fuseEnded}
          />
        </svg>
      )}
    </button>
  )
}
