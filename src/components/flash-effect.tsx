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
