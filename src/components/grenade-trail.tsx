import { useId } from "react"

import { cn } from "@/lib/utils"

const HEX = /^#[0-9a-f]{6}$/i
const SHAPES = new Set(["line", "dash", "double", "helix", "comet", "rainbow"])
// The thrown arc: a quadratic curve from the hand (left) to the grenade (right).
const P0 = { x: 14, y: 104 }
const P1 = { x: 92, y: -6 }
const P2 = { x: 168, y: 52 }
const ARC = `M${P0.x} ${P0.y} Q ${P1.x} ${P1.y} ${P2.x} ${P2.y}`

function point(t: number) {
  const a = (1 - t) * (1 - t)
  const b = 2 * (1 - t) * t
  const c = t * t
  return { x: a * P0.x + b * P1.x + c * P2.x, y: a * P0.y + b * P1.y + c * P2.y }
}

/** A strand beside the arc: offset along the curve's normal by `r * wave(t)` (a constant for "double", a sine for "helix"). */
function strand(wave: (t: number) => number, r: number) {
  const steps = 48
  const out: string[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = point(t)
    const q = point(Math.min(1, t + 0.01))
    const dx = q.x - p.x
    const dy = q.y - p.y
    const length = Math.hypot(dx, dy) || 1
    const offset = r * wave(t)
    out.push(`${i ? "L" : "M"}${(p.x - (dy / length) * offset).toFixed(1)} ${(p.y + (dx / length) * offset).toFixed(1)}`)
  }
  return out.join(" ")
}

/**
 * A grenade's flight in the trail a player picked: the thrown arc in its colour and shape (line, dash, double, helix, comet, rainbow),
 * fading out behind the grenade, which sits at its head. The line draws itself once (off for reduced motion). Colour and shape
 * come from the API as a plain #rrggbb and a short key (never a style string).
 */
export function GrenadeTrail({ color, shape, className }: { color?: string | null; shape?: string | null; className?: string }) {
  const tint = color && HEX.test(color) ? color : "#a3a3a3"
  const kind = shape && SHAPES.has(shape) ? shape : "line"
  const id = useId().replace(/:/g, "")
  const stroke = `url(#trail-${id})`
  const common = { fill: "none", stroke, strokeLinecap: "round" as const, pathLength: 1, className: "lx-trail-draw" }
  return (
    <svg aria-hidden="true" viewBox="0 0 200 120" className={cn("block aspect-[5/3] w-full max-w-[220px]", className)}>
      <defs>
        <linearGradient id={`trail-${id}`} x1="0" y1="0" x2="1" y2="0">
          {kind === "rainbow" ? (
            ["#ef4444", "#fb923c", "#fcd34d", "#22c55e", "#38bdf8", "#8b5cf6", "#f472b6"].map((stop, index) => <stop key={stop} offset={`${(index / 6) * 100}%`} stopColor={stop} stopOpacity={index === 0 ? 0.15 : 1} />) // palette-exempt: the rainbow trail
          ) : (
            <>
              <stop offset={kind === "comet" ? "45%" : "0%"} stopColor={tint} stopOpacity="0" />
              <stop offset="75%" stopColor={tint} stopOpacity="0.85" />
              <stop offset="100%" stopColor={tint} stopOpacity="1" />
            </>
          )}
        </linearGradient>
        <radialGradient id={`glow-${id}`}>
          <stop offset="0%" stopColor={kind === "rainbow" ? "#ffffff" : tint} stopOpacity="0.55" />
          <stop offset="100%" stopColor={kind === "rainbow" ? "#ffffff" : tint} stopOpacity="0" />
        </radialGradient>
      </defs>
      {kind === "dash" && <path d={ARC} {...common} strokeWidth="4.5" strokeDasharray="0.05 0.035" className="" />}
      {kind === "double" && (
        <>
          <path d={strand(() => 1, 4.5)} {...common} strokeWidth="2.6" />
          <path d={strand(() => -1, 4.5)} {...common} strokeWidth="2.6" />
        </>
      )}
      {kind === "helix" && (
        <>
          <path d={strand((t) => Math.sin(t * Math.PI * 9), 5.5)} {...common} strokeWidth="2.4" />
          <path d={strand((t) => -Math.sin(t * Math.PI * 9), 5.5)} {...common} strokeWidth="2.4" />
        </>
      )}
      {kind === "comet" && <path d={ARC} {...common} strokeWidth="9" />}
      {(kind === "line" || kind === "rainbow") && <path d={ARC} {...common} strokeWidth="5" />}
      <circle cx={P2.x} cy={P2.y} r={kind === "comet" ? 22 : 16} fill={`url(#glow-${id})`} />
      <circle cx={P2.x} cy={P2.y} r="5.5" fill="#d4d4d4" stroke="#525252" strokeWidth="1.2" />
    </svg>
  )
}

/** A grenade in flight with the light a player picked: a wide glow on a dark wall behind it and a bright core. */
export function GrenadeLight({ color, className }: { color?: string | null; className?: string }) {
  const tint = color && HEX.test(color) ? color : "#a3a3a3"
  const id = useId().replace(/:/g, "")
  return (
    <svg aria-hidden="true" viewBox="0 0 200 120" className={cn("block aspect-[5/3] w-full max-w-[220px]", className)}>
      <defs>
        <radialGradient id={`light-${id}`}>
          <stop offset="0%" stopColor={tint} stopOpacity="0.9" />
          <stop offset="35%" stopColor={tint} stopOpacity="0.35" />
          <stop offset="100%" stopColor={tint} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="96" width="200" height="24" fill={tint} opacity="0.08" />
      <circle cx="100" cy="56" r="58" fill={`url(#light-${id})`} className="lx-light-pulse" />
      <circle cx="100" cy="56" r="7" fill="#e5e5e5" stroke="#525252" strokeWidth="1.2" />
    </svg>
  )
}
