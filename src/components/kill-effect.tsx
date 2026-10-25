import { useId } from "react"

import { cn } from "@/lib/utils"

const HEX = /^#[0-9a-f]{6}$/i
const SHAPES = new Set(["ring", "pillar", "burst", "spiral", "lightning", "rainbow"])
const RAINBOW = ["#ef4444", "#fcd34d", "#22c55e", "#38bdf8", "#8b5cf6"] // palette-exempt: the rainbow kill effect
const FLOOR = 96

/**
 * A kill effect a player picked, where the victim fell: a body lying on the floor and the effect in its colour and shape (ring,
 * pillar, burst, spiral, lightning, rainbow) with a flash of light, playing on a loop (still for reduced motion). Colour and shape come
 * from the API as a plain #rrggbb and a short key (never a style string).
 */
export function KillEffect({ color, shape, className }: { color?: string | null; shape?: string | null; className?: string }) {
  const tint = color && HEX.test(color) ? color : "#a3a3a3"
  const kind = shape && SHAPES.has(shape) ? shape : "ring"
  const id = useId().replace(/:/g, "")
  const glow = kind === "rainbow" ? "#ffffff" : tint
  const ring = (rx: number, stroke: string, delay: number) => <ellipse key={rx} cx="100" cy={FLOOR} rx={rx} ry={rx * 0.26} fill="none" stroke={stroke} strokeWidth="2.6" className="lx-kill-ring" style={{ animationDelay: `${delay}s` }} />
  let effect: React.ReactNode
  if (kind === "pillar") {
    effect = (
      <>
        <rect x="92" y="0" width="16" height={FLOOR} fill={`url(#beam-${id})`} />
        <rect x="98.5" y="0" width="3" height={FLOOR} fill="#ffffff" opacity="0.85" />
        <ellipse cx="100" cy={FLOOR} rx="18" ry="5" fill="none" stroke={tint} strokeWidth="2.4" />
      </>
    )
  } else if (kind === "burst") {
    effect = Array.from({ length: 10 }, (_, index) => {
      const angle = (index / 10) * Math.PI * 2
      const reach = index % 2 ? 56 : 44
      return <line key={index} x1={100 + Math.cos(angle) * 8} y1={78 + Math.sin(angle) * 6} x2={100 + Math.cos(angle) * reach} y2={78 + Math.sin(angle) * reach * 0.6} stroke={tint} strokeWidth="2.6" strokeLinecap="round" />
    })
  } else if (kind === "spiral") {
    const points = Array.from({ length: 41 }, (_, index) => `${(100 + Math.cos(index * 0.55) * 22).toFixed(1)},${(FLOOR - index * 1.9 + Math.sin(index * 0.55) * 5).toFixed(1)}`)
    effect = <polyline points={points.join(" ")} fill="none" stroke={tint} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  } else if (kind === "lightning") {
    const bolt = "104,0 92,22 106,34 90,52 104,62 94,80 100,92"
    effect = (
      <>
        <polyline points={bolt} fill="none" stroke={tint} strokeWidth="6" strokeLinejoin="round" opacity="0.7" />
        <polyline points={bolt} fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round" />
        <ellipse cx="100" cy={FLOOR} rx="26" ry="7" fill="none" stroke={tint} strokeWidth="2.4" />
      </>
    )
  } else if (kind === "rainbow") {
    effect = [22, 40, 58].map((rx, index) => ring(rx, `url(#rainbow-${id})`, index * 0.15))
  } else {
    effect = [22, 40, 58].map((rx, index) => ring(rx, tint, index * 0.15))
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 200 120" className={cn("block aspect-[5/3] w-full max-w-[220px]", className)}>
      <defs>
        <radialGradient id={`flash-${id}`}>
          <stop offset="0%" stopColor={glow} stopOpacity="0.6" />
          <stop offset="100%" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`beam-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tint} stopOpacity="0" />
          <stop offset="100%" stopColor={tint} stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id={`rainbow-${id}`} x1="0" y1="0" x2="1" y2="0">
          {RAINBOW.map((stop, index) => <stop key={stop} offset={`${index * 25}%`} stopColor={stop} />)}
        </linearGradient>
      </defs>
      <ellipse cx="100" cy={FLOOR} rx="70" ry="16" fill="#262626" opacity="0.6" />
      {/* The victim, lying on the floor. */}
      <rect x="82" y={FLOOR - 7} width="36" height="8" rx="4" fill="#525252" />
      <circle cx="122" cy={FLOOR - 4} r="4.5" fill="#525252" />
      <g className="lx-kill-play">
        <ellipse cx="100" cy={FLOOR - 14} rx="62" ry="40" fill={`url(#flash-${id})`} />
        {effect}
      </g>
    </svg>
  )
}
