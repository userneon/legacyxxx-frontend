import { useId } from "react"

import { cn } from "@/lib/utils"

const HEX = /^#[0-9a-f]{6}$/i
const SHAPES = new Set(["classic", "crack", "electric", "laser", "water", "prism"])
// Fixed jitter for the electric bolts and the cracks, so the art never changes between renders.
const BOLT = [0, 5, -6, 7, -4, 8, -7, 3, -8, 6, -5, 4, 0]
const CRACK = [0, 3, -4, 5, -2, 6, -5, 2, -6, 4, -3, 3, 0]
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

/** A strand beside the arc: offset along the curve's normal by `r * wave(t)`. */
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

/** A jagged line along the arc: each point pushed up or down by the fixed jitter. */
function jagged(jitter: number[], from: number) {
  return jitter.map((offset, index) => {
    const t = from + (index / (jitter.length - 1)) * (1 - from)
    const p = point(t)
    return `${index ? "L" : "M"}${p.x.toFixed(1)} ${(p.y + offset).toFixed(1)}`
  }).join(" ")
}

/**
 * A grenade's flight in the trail a player picked (owner request 2026-11-14, the six designs of the Workshop addon: classic, crack, electric, laser,
 * water, prism), drawn on the thrown arc in the player's colour and fading out behind the grenade, which sits at its head; a spark burst
 * marks where it bounces. The line draws itself once (off for reduced motion). Colour and shape come from the API as a plain #rrggbb and a short
 * key (never a style string).
 */
export function GrenadeTrail({ color, shape, className }: { color?: string | null; shape?: string | null; className?: string }) {
  const tint = color && HEX.test(color) ? color : "#a3a3a3"
  const kind = shape && SHAPES.has(shape) ? shape : "classic"
  const id = useId().replace(/:/g, "")
  const stroke = `url(#trail-${id})`
  const common = { fill: "none", stroke, strokeLinecap: "round" as const, pathLength: 1, className: "lx-trail-draw" }
  return (
    <svg aria-hidden="true" viewBox="0 0 200 120" className={cn("block aspect-[5/3] w-full max-w-[220px]", className)}>
      <defs>
        <linearGradient id={`trail-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={tint} stopOpacity="0" />
          <stop offset="75%" stopColor={tint} stopOpacity="0.85" />
          <stop offset="100%" stopColor={tint} stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`core-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id={`glow-${id}`}>
          <stop offset="0%" stopColor={tint} stopOpacity="0.55" />
          <stop offset="100%" stopColor={tint} stopOpacity="0" />
        </radialGradient>
      </defs>
      {kind === "classic" && (
        <>
          <path d={ARC} {...common} strokeWidth="14" opacity="0.35" />
          <path d={ARC} {...common} strokeWidth="7" />
          <path d={ARC} fill="none" stroke={`url(#core-${id})`} strokeWidth="2.4" strokeLinecap="round" pathLength={1} className="lx-trail-draw" />
        </>
      )}
      {kind === "crack" && (
        <>
          <path d={jagged(CRACK, 0.12)} fill="none" stroke={tint} strokeWidth="9" strokeLinejoin="miter" opacity="0.25" />
          <path d={jagged(CRACK, 0.12)} {...common} strokeWidth="3.2" strokeLinejoin="miter" />
          <path d={jagged(CRACK.map((offset) => -offset * 0.8), 0.3)} {...common} strokeWidth="1.6" strokeLinejoin="miter" opacity="0.8" />
          <path d={jagged(CRACK, 0.12)} fill="none" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="miter" opacity="0.85" />
        </>
      )}
      {kind === "electric" && (
        <g className="lx-trail-flicker">
          <path d={jagged(BOLT, 0.18)} fill="none" stroke={tint} strokeWidth="8" strokeLinejoin="miter" opacity="0.3" />
          <path d={jagged(BOLT, 0.18)} {...common} strokeWidth="2.6" strokeLinejoin="miter" />
          <path d={jagged(BOLT.map((offset) => -offset), 0.3)} {...common} strokeWidth="1.6" strokeLinejoin="miter" opacity="0.8" />
          <path d={jagged(BOLT, 0.18)} fill="none" stroke="#ffffff" strokeWidth="1" strokeLinejoin="miter" opacity="0.9" />
        </g>
      )}
      {kind === "laser" && (
        <>
          <path d={ARC} {...common} strokeWidth="12" opacity="0.22" />
          <path d={ARC} {...common} strokeWidth="3" />
          <path d={ARC} fill="none" stroke={`url(#core-${id})`} strokeWidth="1.2" strokeLinecap="round" pathLength={1} className="lx-trail-draw" />
        </>
      )}
      {kind === "water" && (
        <>
          <path d={strand((t) => Math.sin(t * Math.PI * 6), 4)} {...common} strokeWidth="9" opacity="0.4" />
          <path d={strand((t) => Math.sin(t * Math.PI * 6), 4)} {...common} strokeWidth="3.6" />
          {[0.35, 0.5, 0.62, 0.74, 0.86].map((t, index) => {
            const p = point(t)
            return <circle key={t} cx={p.x + (index % 2 ? 4 : -3)} cy={p.y + 8 + (index % 3) * 3} r={1.4 + (index % 2) * 0.8} fill={tint} opacity="0.75" />
          })}
        </>
      )}
      {kind === "prism" && (
        <>
          <path d={strand(() => 5, 1)} {...common} strokeWidth="3.4" opacity="0.9" style={{ filter: "hue-rotate(-45deg)" }} />
          <path d={strand(() => 0, 1)} {...common} strokeWidth="3.8" />
          <path d={strand(() => -5, 1)} {...common} strokeWidth="3.4" opacity="0.9" style={{ filter: "hue-rotate(45deg)" }} />
          <path d={ARC} fill="none" stroke={`url(#core-${id})`} strokeWidth="1.4" strokeLinecap="round" pathLength={1} className="lx-trail-draw" />
        </>
      )}
      {[0, 1, 2, 3, 4, 5].map((index) => {
        const angle = (index / 6) * Math.PI * 2 + 0.4
        return <line key={index} x1={P2.x + Math.cos(angle) * 9} y1={P2.y + Math.sin(angle) * 9} x2={P2.x + Math.cos(angle) * 17} y2={P2.y + Math.sin(angle) * 17} stroke={index % 2 ? "#ffffff" : tint} strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
      })}
      <circle cx={P2.x} cy={P2.y} r="16" fill={`url(#glow-${id})`} />
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
