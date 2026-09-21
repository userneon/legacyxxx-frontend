import { useId, type ReactNode } from "react"

import { cn } from "@/lib/utils"

export type TopRank = 1 | 2 | 3

/** Metal per place: gold, silver, bronze. `glow` tints the soft light around the frame. */
const METALS: Record<TopRank, { light: string; mid: string; dark: string; glow: string; glowSize: number }> = {
  1: { light: "#fff1c2", mid: "#f2b33d", dark: "#6e4410", glow: "rgba(255, 186, 64, 0.55)", glowSize: 7 },
  2: { light: "#ffffff", mid: "#b8c4d6", dark: "#3b4452", glow: "rgba(190, 212, 255, 0.45)", glowSize: 5 },
  3: { light: "#ffd9bf", mid: "#c2825a", dark: "#4d2c1a", glow: "rgba(232, 148, 98, 0.42)", glowSize: 5 },
}

export function isTopRank(position: number | null | undefined): position is TopRank {
  return position === 1 || position === 2 || position === 3
}

/** Rounded rectangle as a path, so two of them can be cut into a band with evenodd. */
function roundedRect(x: number, y: number, w: number, h: number, r: number) {
  return `M${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x + r}Q${x},${y + h} ${x},${y + h - r}V${y + r}Q${x},${y} ${x + r},${y}Z`
}

const mirror = (points: [number, number][]) => points.map(([x, y]) => [100 - x, y] as [number, number])
const poly = (points: [number, number][]) => points.map(([x, y]) => `${x},${y}`).join(" ")

// Geometry in a 0–100 square (the avatar); the frame draws outside it.
const OUTER = roundedRect(-9, -9, 118, 118, 12)
const INNER = roundedRect(-1.5, -1.5, 103, 103, 6)
const SIDE_SLASHES: [number, number][][] = [
  [[-9, 34], [-1.5, 25], [-1.5, 35], [-9, 44]],
  [[-9, 58], [-1.5, 49], [-1.5, 54], [-9, 63]],
]
const BOTTOM_SLASHES: [number, number][][] = [
  [[10, 109], [18, 101.5], [27, 101.5], [19, 109]],
  [[22, 109], [30, 101.5], [34, 101.5], [26, 109]],
]

/**
 * LEGACY-X Top 1 / 2 / 3 avatar frame. Wraps a square avatar: the child fills the square and the
 * frame (label plate, crown for first place, chevron and gem) is drawn around it with a soft glow.
 * `label` hides the "TOP n" text where the frame is too small to read it.
 */
export function TopRankFrame({ rank, children, className, label = true }: { rank: TopRank; children: ReactNode; className?: string; label?: boolean }) {
  const id = useId().replace(/:/g, "")
  const metal = METALS[rank]
  const g = (name: string) => `${name}-${id}`

  return (
    <div className={cn("relative isolate", className)}>
      <div className="size-full overflow-hidden rounded-[6%]">{children}</div>
      <svg
        viewBox="-18 -27 136 148"
        aria-hidden="true"
        className="top-rank-frame pointer-events-none absolute left-[-18%] top-[-27%] h-[148%] w-[136%] overflow-visible"
        style={{ "--frame-glow": metal.glow, "--frame-glow-size": `${metal.glowSize}px` } as React.CSSProperties}
      >
        <defs>
          <linearGradient id={g("metal")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={metal.light} />
            <stop offset="0.3" stopColor={metal.mid} />
            <stop offset="0.52" stopColor={metal.dark} />
            <stop offset="0.75" stopColor={metal.mid} />
            <stop offset="1" stopColor={metal.light} />
          </linearGradient>
          <linearGradient id={g("band")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a2a2c" />
            <stop offset="1" stopColor="#0c0c0d" />
          </linearGradient>
          <radialGradient id={g("gem")} cx="0.5" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.45" stopColor={metal.light} />
            <stop offset="1" stopColor={metal.mid} />
          </radialGradient>
          <filter id={g("blur")} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>

        {/* Dark metal band with a faint tint of the tier colour */}
        <path d={`${OUTER}${INNER}`} fillRule="evenodd" fill={`url(#${g("band")})`} />
        <path d={`${OUTER}${INNER}`} fillRule="evenodd" fill={`url(#${g("metal")})`} opacity="0.16" />

        {/* Side and bottom slashes */}
        {[...SIDE_SLASHES, ...SIDE_SLASHES.map(mirror), ...BOTTOM_SLASHES, ...BOTTOM_SLASHES.map(mirror)].map((points, index) => (
          <polygon key={index} points={poly(points)} fill={`url(#${g("metal")})`} opacity={index % 2 === 0 ? 0.9 : 0.55} />
        ))}

        {/* Bright edges, with a blurred copy underneath for the glow */}
        <path d={OUTER} fill="none" stroke={metal.light} strokeWidth="1.6" opacity="0.55" filter={`url(#${g("blur")})`} />
        <path d={OUTER} fill="none" stroke={`url(#${g("metal")})`} strokeWidth="1.4" />
        <path d={INNER} fill="none" stroke={`url(#${g("metal")})`} strokeWidth="0.9" opacity="0.9" />

        {/* Top wing and label plate */}
        <polygon points={poly([[19, -10], [81, -10], [73, 1], [27, 1]])} fill={`url(#${g("metal")})`} />
        <path d="M29,-13H71L68,2.5Q67.5,4.5 65.5,4.5H34.5Q32.5,4.5 32,2.5Z" fill="#0d0d0e" stroke={`url(#${g("metal")})`} strokeWidth="0.8" />
        {label && (
          <text x="50" y="-3.6" textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="700" letterSpacing="1.4" fontFamily="inherit">
            <tspan fill="#d6d6d8">TOP </tspan>
            <tspan fill={metal.light}>{rank}</tspan>
          </text>
        )}

        {/* Crown for first place */}
        {rank === 1 && (
          <>
            <polygon points={poly([[40.5, -13], [38, -23], [44.5, -18], [50, -26], [55.5, -18], [62, -23], [59.5, -13]])} fill={metal.light} opacity="0.6" filter={`url(#${g("blur")})`} />
            <polygon points={poly([[40.5, -13], [38, -23], [44.5, -18], [50, -26], [55.5, -18], [62, -23], [59.5, -13]])} fill={`url(#${g("metal")})`} stroke={metal.light} strokeWidth="0.5" />
          </>
        )}

        {/* Bottom chevrons and gem */}
        <polygon points={poly([[32, 101], [50, 118], [68, 101], [61.5, 101], [50, 111.5], [38.5, 101]])} fill={`url(#${g("metal")})`} />
        <polygon points={poly([[42, 101], [50, 109], [58, 101], [54.5, 101], [50, 105], [45.5, 101]])} fill={`url(#${g("metal")})`} opacity="0.8" />
        <polygon points={poly([[50, 94], [54.5, 99.5], [50, 105], [45.5, 99.5]])} fill={metal.light} opacity="0.7" filter={`url(#${g("blur")})`} />
        <polygon points={poly([[50, 94], [54.5, 99.5], [50, 105], [45.5, 99.5]])} fill={`url(#${g("gem")})`} stroke={metal.light} strokeWidth="0.4" />
      </svg>
    </div>
  )
}
