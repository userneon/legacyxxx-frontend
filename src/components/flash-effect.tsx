import { useId } from "react"

import { cn } from "@/lib/utils"

const HEX = /^#[0-9a-f]{6}$/i
const SHAPES = new Set(["starburst", "nova", "ring", "prism"])
const RAINBOW = ["#ef4444", "#fb923c", "#fcd34d", "#22c55e", "#38bdf8", "#8b5cf6", "#f472b6"] // palette-exempt: the prism flash effect
const CX = 100
const CY = 58

/**
 * A flash effect a player picked, where their flashbang bursts: the effect in its colour and shape (starburst, nova, ring, prism)
 * round a white burst, playing on a loop (still for reduced motion). Colour and shape come from the API as a plain #rrggbb and a short
 * key (never a style string).
 */
export function FlashEffect({ color, shape, className }: { color?: string | null; shape?: string | null; className?: string }) {
  const tint = color && HEX.test(color) ? color : "#a3a3a3"
  const kind = shape && SHAPES.has(shape) ? shape : "starburst"
  const id = useId().replace(/:/g, "")
  const ray = (index: number, count: number, length: number, stroke: string, width: number) => {
    const angle = (index / count) * Math.PI * 2 + 0.2
    return <line key={`${count}-${index}`} x1={CX + Math.cos(angle) * 9} y1={CY + Math.sin(angle) * 9} x2={CX + Math.cos(angle) * length} y2={CY + Math.sin(angle) * length * 0.85} stroke={stroke} strokeWidth={width} strokeLinecap="round" />
  }
  let effect: React.ReactNode
  if (kind === "nova") {
    effect = (
      <g fill="none" stroke={tint} strokeWidth="2.4">
        <circle cx={CX} cy={CY} r="34" />
        <ellipse cx={CX} cy={CY} rx="34" ry="11" />
        <ellipse cx={CX} cy={CY} rx="11" ry="34" />
        <circle cx={CX} cy={CY} r="19" strokeOpacity="0.6" />
      </g>
    )
  } else if (kind === "ring") {
    effect = [16, 32, 48].map((rx, index) => <ellipse key={rx} cx={CX} cy={CY + 8} rx={rx} ry={rx * 0.28} fill="none" stroke={tint} strokeWidth={3 - index * 0.4} className="lx-kill-ring" style={{ animationDelay: `${index * 0.12}s` }} />)
  } else if (kind === "prism") {
    effect = Array.from({ length: 14 }, (_, index) => ray(index, 14, 44, RAINBOW[index % RAINBOW.length], 2.6))
  } else {
    effect = [...Array.from({ length: 14 }, (_, index) => ray(index, 14, 44, tint, 2.6)), ...Array.from({ length: 6 }, (_, index) => ray(index + 0.5, 6, 26, "#ffffff", 1.4))]
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 200 120" className={cn("block aspect-[5/3] w-full max-w-[220px]", className)}>
      <defs>
        <radialGradient id={`burst-${id}`}>
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="30%" stopColor={kind === "prism" ? "#ffffff" : tint} stopOpacity="0.5" />
          <stop offset="100%" stopColor={kind === "prism" ? "#ffffff" : tint} stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="lx-kill-play">
        <circle cx={CX} cy={CY} r="52" fill={`url(#burst-${id})`} />
        {effect}
        <circle cx={CX} cy={CY} r="4.5" fill="#ffffff" />
      </g>
    </svg>
  )
}

const HE_SHAPES = new Set(["shockwave", "dome", "burst", "embers", "prism"])
const FLOOR = 94

/**
 * An HE explosion effect a player picked, on top of the blast: the effect in its colour and shape (shockwave, dome, burst, embers,
 * prism) over a fiery core on the floor, playing on a loop (still for reduced motion). Colour and shape come from the API as a plain
 * #rrggbb and a short key.
 */
export function HeEffect({ color, shape, className }: { color?: string | null; shape?: string | null; className?: string }) {
  const tint = color && HEX.test(color) ? color : "#a3a3a3"
  const kind = shape && HE_SHAPES.has(shape) ? shape : "shockwave"
  const id = useId().replace(/:/g, "")
  const rays = (count: number, length: number, stroke: (index: number) => string, width: number) =>
    Array.from({ length: count }, (_, index) => {
      // Out and up only, never into the floor.
      const angle = Math.PI + (index / (count - 1)) * Math.PI
      const reach = length * (index % 2 ? 0.75 : 1)
      return <line key={`${count}-${index}`} x1={100} y1={FLOOR - 6} x2={100 + Math.cos(angle) * reach * 1.3} y2={FLOOR - 6 + Math.sin(angle) * reach} stroke={stroke(index)} strokeWidth={width} strokeLinecap="round" />
    })
  let effect: React.ReactNode
  if (kind === "dome") {
    effect = [[58, 0], [50, 22], [36, 40], [16, 50]].map(([rx, up]) => <ellipse key={rx} cx="100" cy={FLOOR - up} rx={rx} ry={rx * 0.24} fill="none" stroke={tint} strokeWidth="2.6" />)
  } else if (kind === "burst") {
    effect = [...rays(11, 62, () => tint, 3), ...rays(5, 34, () => "#ffffff", 1.4)]
  } else if (kind === "embers") {
    effect = Array.from({ length: 12 }, (_, index) => {
      const side = index % 2 ? 1 : -1
      const spread = 14 + index * 5
      const top = 30 + (index % 4) * 9
      return <path key={index} d={`M100 ${FLOOR - 6} Q ${100 + side * spread * 0.5} ${top} ${100 + side * spread} ${FLOOR - 4}`} fill="none" stroke={index % 3 === 0 ? "#ffffff" : tint} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="3 5" />
    })
  } else if (kind === "prism") {
    effect = rays(13, 62, (index) => RAINBOW[index % RAINBOW.length], 2.8)
  } else {
    effect = [24, 50, 76].map((rx, index) => <ellipse key={rx} cx="100" cy={FLOOR} rx={rx} ry={rx * 0.22} fill="none" stroke={tint} strokeWidth={4 - index} className="lx-kill-ring" style={{ animationDelay: `${index * 0.1}s` }} />)
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 200 120" className={cn("block aspect-[5/3] w-full max-w-[220px]", className)}>
      <defs>
        <radialGradient id={`blast-${id}`}>
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="25%" stopColor={kind === "prism" ? "#ffffff" : tint} stopOpacity="0.6" />
          <stop offset="100%" stopColor={kind === "prism" ? "#ffffff" : tint} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy={FLOOR} rx="82" ry="16" fill="#262626" opacity="0.6" />
      <g className="lx-kill-play">
        <ellipse cx="100" cy={FLOOR - 14} rx="66" ry="44" fill={`url(#blast-${id})`} />
        {effect}
      </g>
    </svg>
  )
}
