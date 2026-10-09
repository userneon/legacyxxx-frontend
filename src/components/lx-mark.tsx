import { useId } from "react"

/** The LX currency mark: a silver coin with "LX" on it. Used next to every LX amount that wants a mark. */
export function LxMark({ size = 20, className }: { size?: number; className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#d4d4d4" />
          <stop offset="1" stopColor="#737373" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill={`url(#${id})`} />
      <circle cx="32" cy="32" r="24.5" fill="none" stroke="#0a0a0a" strokeOpacity="0.35" strokeWidth="2" />
      <text x="32" y="39.5" textAnchor="middle" fontWeight="800" fontSize="21" fill="#0a0a0a" letterSpacing="-1" style={{ fontFamily: "inherit" }}>LX</text>
    </svg>
  )
}
