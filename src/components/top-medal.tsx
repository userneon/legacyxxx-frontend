import { useId } from "react"

/**
 * The medals of the ladder's top three (owner 2026-11-18: "draw it yourself"): a round medal with a raised rim, a laurel wreath, a star with a blue gem and a ribbon; the first has a crown.
 * Drawn in SVG with metal gradients, so it stays sharp at any size and needs no picture. The colours are the metals' own (palette-exempt).
 */
const METAL: Record<1 | 2 | 3, { hi: string; light: string; mid: string; dark: string; deep: string; name: string }> = {
  1: { hi: "#fff6c2", light: "#f8d658", mid: "#d9a21c", dark: "#9a6a08", deep: "#5b3c04", name: "gold" },   // palette-exempt
  2: { hi: "#ffffff", light: "#dfe5ee", mid: "#aab4c4", dark: "#6d788a", deep: "#363e4c", name: "silver" }, // palette-exempt
  3: { hi: "#ffe2c2", light: "#e49a5a", mid: "#b8692f", dark: "#7d4118", deep: "#40200a", name: "bronze" },  // palette-exempt
}
const ROMAN = { 1: "I", 2: "II", 3: "III" } as const

function leaf(angle: number, radius: number, side: 1 | -1) {
  const a = (angle * Math.PI) / 180
  const x = 64 + Math.cos(a) * radius * side
  const y = 66 + Math.sin(a) * radius
  return { x, y, rot: side === 1 ? angle + 90 : -(angle + 90) + 180 }
}

export function TopMedal({ place, size = 48, className }: { place: 1 | 2 | 3; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "")
  const m = METAL[place]
  const leaves: Array<{ x: number; y: number; rot: number; s: number }> = []
  for (const side of [1, -1] as const) {
    for (let i = 0; i < 7; i += 1) {
      const angle = 118 - i * 17 // from the bottom, up the side
      const l = leaf(angle, 47, side)
      leaves.push({ x: l.x, y: l.y, rot: side === 1 ? angle + 90 - 12 : -(angle + 90) + 12, s: 1 - i * 0.04 })
    }
  }
  const star = Array.from({ length: 10 }, (_, k) => {
    const r = k % 2 === 0 ? 17 : 7.4
    const a = (-90 + k * 36) * (Math.PI / 180)
    return `${(64 + Math.cos(a) * r).toFixed(2)},${(66 + Math.sin(a) * r).toFixed(2)}`
  }).join(" ")
  return (
    <svg viewBox="0 0 128 128" width={size} height={size} className={className} role="img" aria-label={`Rank ${place}`}>
      <defs>
        <linearGradient id={`${id}m`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={m.hi} /><stop offset="0.28" stopColor={m.light} /><stop offset="0.62" stopColor={m.mid} /><stop offset="1" stopColor={m.dark} />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="0.8" y1="1" x2="0.2" y2="0">
          <stop offset="0" stopColor={m.deep} /><stop offset="0.5" stopColor={m.dark} /><stop offset="1" stopColor={m.light} />
        </linearGradient>
        <radialGradient id={`${id}d`} cx="0.38" cy="0.3" r="0.9">
          <stop offset="0" stopColor={m.light} /><stop offset="0.55" stopColor={m.mid} /><stop offset="1" stopColor={m.dark} />
        </radialGradient>
        <radialGradient id={`${id}g`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#bfe4ff" /><stop offset="0.45" stopColor="#2f8bff" /><stop offset="1" stopColor="#0b2f8f" />
        </radialGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c5bd6" /><stop offset="1" stopColor="#10256e" />
        </linearGradient>
      </defs>
      {/* ribbon tails */}
      <path d="M44 84 L30 124 L44 116 L52 126 L64 90 Z" fill={`url(#${id}b)`} />
      <path d="M84 84 L98 124 L84 116 L76 126 L64 90 Z" fill={`url(#${id}b)`} />
      <path d="M44 84 L64 90 L52 126" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      {/* laurel */}
      {leaves.map((l, index) => (
        <ellipse key={index} cx={l.x} cy={l.y} rx={8.6 * l.s} ry={3.6 * l.s} transform={`rotate(${l.rot} ${l.x} ${l.y})`} fill={`url(#${id}m)`} stroke={m.deep} strokeOpacity="0.5" strokeWidth="0.6" />
      ))}
      {/* disc: rim, field, bevel light */}
      <circle cx="64" cy="66" r="40" fill={`url(#${id}r)`} />
      <circle cx="64" cy="66" r="37.5" fill={`url(#${id}m)`} />
      <circle cx="64" cy="66" r="31" fill={`url(#${id}d)`} stroke={m.deep} strokeOpacity="0.55" strokeWidth="1" />
      <path d="M33 54 A33 33 0 0 1 70 34" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
      {/* star and gem */}
      <polygon points={star} fill={`url(#${id}m)`} stroke={m.deep} strokeOpacity="0.7" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="64" cy="66" r="5.2" fill={`url(#${id}g)`} stroke={m.deep} strokeOpacity="0.8" strokeWidth="0.8" />
      <circle cx="62.2" cy="64.2" r="1.5" fill="#fff" fillOpacity="0.85" />
      <text x="64" y="93" textAnchor="middle" fontSize="9" fontWeight="800" letterSpacing="1.5" fill={m.deep} fillOpacity="0.85" fontFamily="ui-sans-serif, system-ui, sans-serif">{ROMAN[place]}</text>
      {/* crown for the first */}
      {place === 1 && (
        <g>
          <path d="M46 24 L50 10 L57 19 L64 6 L71 19 L78 10 L82 24 Z" fill={`url(#${id}m)`} stroke={m.deep} strokeOpacity="0.7" strokeWidth="1" strokeLinejoin="round" />
          <rect x="46" y="23" width="36" height="5" rx="2" fill={`url(#${id}r)`} />
          <circle cx="64" cy="8" r="2.2" fill={`url(#${id}g)`} /><circle cx="50" cy="12" r="1.7" fill={`url(#${id}g)`} /><circle cx="78" cy="12" r="1.7" fill={`url(#${id}g)`} />
        </g>
      )}
    </svg>
  )
}
