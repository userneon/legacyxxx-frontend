import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

/** Starts at 0 and moves to `value` on the next frame, so bars and rings fill in with a CSS transition. */
function useFillIn(value: number) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    // Hidden tabs pause requestAnimationFrame; show the final value instead of leaving the bar empty.
    if (document.visibilityState === "hidden") {
      setShown(value)
      return
    }
    const frame = requestAnimationFrame(() => setShown(value))
    return () => cancelAnimationFrame(frame)
  }, [value])
  return shown
}

/**
 * FACEIT CS2 skill levels: minimum ELO, icon colour, and how much of the gauge the official icon fills
 * (the icon fill is not linear in the level; values measured from FACEIT's own level icons).
 */
/* palette-exempt: FACEIT's own level colours, drawn only inside the level icon. */
const FACEIT_LEVELS = [
  { level: 1, min: 100, color: "#eeeeee", fill: 0 },
  { level: 2, min: 501, color: "#46e070", fill: 6 },
  { level: 3, min: 751, color: "#46e070", fill: 11 },
  { level: 4, min: 901, color: "#ffcd29", fill: 27 }, // palette-exempt: FACEIT level colour
  { level: 5, min: 1051, color: "#ffcd29", fill: 45 }, // palette-exempt: FACEIT level colour
  { level: 6, min: 1201, color: "#ffcd29", fill: 60 }, // palette-exempt: FACEIT level colour
  { level: 7, min: 1351, color: "#ffcd29", fill: 69 }, // palette-exempt: FACEIT level colour
  { level: 8, min: 1531, color: "#ff6f20", fill: 81 },
  { level: 9, min: 1751, color: "#ff6f20", fill: 92 },
  { level: 10, min: 2001, color: "#e8002b", fill: 100 },
] as const

export function faceitLevelProgress(level: number, elo: number) {
  const current = FACEIT_LEVELS.find((entry) => entry.level === level) ?? FACEIT_LEVELS[0]
  const next = FACEIT_LEVELS.find((entry) => entry.level === current.level + 1)
  if (!next) return { color: current.color, percent: 100, toNext: 0, nextLevel: null as number | null }
  const span = next.min - current.min
  const percent = Math.max(0, Math.min(100, ((elo - current.min) / span) * 100))
  return { color: current.color, percent, toNext: Math.max(0, next.min - elo), nextLevel: next.level }
}

/** 270° gauge with the gap at the bottom, drawn clockwise from bottom-left like FACEIT's level icons. */
const FACEIT_GAUGE_RADIUS = 37
/** Real arc length; used instead of pathLength, which some SVG renderers ignore for dash patterns. */
const FACEIT_GAUGE_LENGTH = FACEIT_GAUGE_RADIUS * 1.5 * Math.PI
const FACEIT_GAUGE_PATH = (() => {
  const radius = FACEIT_GAUGE_RADIUS
  const point = (degrees: number) => {
    const radians = (degrees * Math.PI) / 180
    return `${(50 + radius * Math.cos(radians)).toFixed(3)} ${(50 + radius * Math.sin(radians)).toFixed(3)}`
  }
  return `M ${point(135)} A ${radius} ${radius} 0 1 1 ${point(45)}`
})()
const FACEIT_GAUGE_START = { x: 50 + FACEIT_GAUGE_RADIUS * Math.cos((135 * Math.PI) / 180), y: 50 + FACEIT_GAUGE_RADIUS * Math.sin((135 * Math.PI) / 180) }

/**
 * Vector recreation of the FACEIT skill level icon (crisp at any size). The coloured arc fills to the level on mount:
 * level 1 is a dot at the start, level 10 the full gauge. `level={null}` renders the empty "not connected" badge.
 */
export function FaceitLevelBadge({ level, className }: { level: number | null; className?: string }) {
  const entry = level === null ? null : FACEIT_LEVELS.find((item) => item.level === level) ?? null
  const target = entry?.fill ?? 0
  const shown = useFillIn(target)
  const color = entry?.color ?? "#5b5b60"

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={entry ? `FACEIT level ${entry.level}` : "FACEIT not connected"}
      className={cn("faceit-level-badge shrink-0", className)}
    >
      <circle cx="50" cy="50" r="49" fill="#131315" />
      <path d={FACEIT_GAUGE_PATH} fill="none" stroke="#2a2a2f" strokeWidth="10" strokeLinecap="round" />
      {/* Level 1 is a single dot at the start of the gauge, as in the official icon. */}
      {entry?.level === 1 && <circle cx={FACEIT_GAUGE_START.x} cy={FACEIT_GAUGE_START.y} r="5" fill={color} className="faceit-level-dot" />}
      {entry && entry.level > 1 && (
        <path
          d={FACEIT_GAUGE_PATH}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${FACEIT_GAUGE_LENGTH} ${FACEIT_GAUGE_LENGTH}`}
          strokeDashoffset={FACEIT_GAUGE_LENGTH * (1 - shown / 100)}
          className="faceit-level-fill"
          style={{ filter: `drop-shadow(0 0 3px ${color}99)` }}
        />
      )}
      <text
        key={entry?.level ?? "none"}
        x="50"
        y="52"
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={entry?.level === 10 ? 33 : 40}
        fontWeight={900}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        className="faceit-level-number"
      >
        {entry ? entry.level : "–"}
      </text>
    </svg>
  )
}

