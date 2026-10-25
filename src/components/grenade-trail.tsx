import { useId } from "react"

import { cn } from "@/lib/utils"

const HEX = /^#[0-9a-f]{6}$/i
const SHAPES = new Set(["line", "dash", "double", "helix", "comet", "rainbow", "zigzag", "flare", "sparks", "starfall", "inferno"])
// Fixed spots along the arc (0 = hand, 1 = grenade) for the effects a trail leaves on its way, so the art never changes between renders.
const ALONG = [0.38, 0.5, 0.62, 0.74, 0.86]
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

/** A sharp triangle wave (-1..1) along the arc, seven zigs from hand to grenade. */
const zigzag = (t: number) => 1 - Math.abs(((t * 7) % 2) - 1) * 2

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
 * A grenade's flight in the trail a player picked: the thrown arc in its colour and shape (line, dash, double, helix, comet, rainbow, zigzag;
 * with effects on the way: flare drops glowing flares, sparks throws sparks, starfall scatters stars, inferno does all three),
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
        <linearGradient id={`core-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id={`glow-${id}`}>
          <stop offset="0%" stopColor={kind === "rainbow" ? "#ffffff" : tint} stopOpacity="0.55" />
          <stop offset="100%" stopColor={kind === "rainbow" ? "#ffffff" : tint} stopOpacity="0" />
        </radialGradient>
      </defs>
      {kind === "dash" && <path d={ARC} {...common} strokeWidth="6" strokeDasharray="0.05 0.035" className="" />}
      {kind === "double" && (
        <>
          <path d={strand(() => 1, 5.5)} {...common} strokeWidth="3.4" />
          <path d={strand(() => -1, 5.5)} {...common} strokeWidth="3.4" />
        </>
      )}
      {kind === "helix" && (
        <>
          <path d={strand((t) => Math.sin(t * Math.PI * 9), 6.5)} {...common} strokeWidth="3.2" />
          <path d={strand((t) => -Math.sin(t * Math.PI * 9), 6.5)} {...common} strokeWidth="3.2" />
        </>
      )}
      {kind === "zigzag" && (
        <>
          <path d={strand(zigzag, 8)} {...common} strokeWidth="3.2" strokeLinejoin="miter" />
          <path d={strand((t) => -zigzag(t), 8)} {...common} strokeWidth="3.2" strokeLinejoin="miter" />
        </>
      )}
      {kind === "comet" && <path d={ARC} {...common} strokeWidth="12" />}
      {(kind === "line" || kind === "rainbow" || kind === "flare" || kind === "sparks" || kind === "starfall") && <path d={ARC} {...common} strokeWidth={kind === "starfall" ? 5 : 6.5} />}
      {kind === "inferno" && (
        <>
          <path d={ARC} {...common} strokeWidth="10" />
          <path d={ARC} fill="none" stroke={`url(#core-${id})`} strokeWidth="2.2" strokeLinecap="round" pathLength={1} className="lx-trail-draw" />
        </>
      )}
      <g className="lx-trail-fx">
        {(kind === "flare" || kind === "inferno") && ALONG.filter((_, index) => kind === "flare" || index % 2 === 0).map((t) => {
          const p = point(t)
          return (
            <g key={t}>
              <circle cx={p.x} cy={p.y + 6} r="11" fill={`url(#glow-${id})`} />
              <circle cx={p.x} cy={p.y + 6} r="2.2" fill="#ffffff" />
            </g>
          )
        })}
        {(kind === "sparks" || kind === "inferno") && ALONG.flatMap((t, index) => {
          const p = point(t)
          return [-1, 1].map((side) => <line key={`${t}${side}`} x1={p.x} y1={p.y} x2={p.x + side * (6 + index)} y2={p.y + 9 + (index % 2) * 4} stroke={side < 0 ? "#ffffff" : tint} strokeWidth="1.4" strokeLinecap="round" />)
        })}
        {(kind === "starfall" || kind === "inferno") && ALONG.map((t, index) => {
          const p = point(t)
          const x = p.x + (index % 2 ? 9 : -8)
          const y = p.y + (index % 3) * 6 - 8
          const r = 3 + (index % 2) * 1.5
          return <path key={t} d={`M${x - r} ${y} L${x + r} ${y} M${x} ${y - r} L${x} ${y + r}`} stroke={index % 2 ? "#ffffff" : tint} strokeWidth="1.4" strokeLinecap="round" />
        })}
      </g>
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
