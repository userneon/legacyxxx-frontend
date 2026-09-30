import { memo } from "react"

/**
 * Background beams (the shadcn/Aceternity "Background Beams" effect): faint curved lines that fan across the
 * page with a soft light travelling along a few of them. Pure SVG + SMIL, no animation library. The light is
 * white only, so it stays inside the neutral palette.
 */
const PATH_COUNT = 40
const LIT_EVERY = 3

const paths = Array.from({ length: PATH_COUNT }, (_, i) => {
  const a = i * 5
  const b = i * 6
  return `M-${380 - a} -${189 + b}C-${380 - a} -${189 + b} -${312 - a} ${216 - b} ${152 - a} ${343 - b}C${616 - a} ${470 - b} ${684 - a} ${875 - b} ${684 - a} ${875 - b}`
})

// Deterministic spread so every load looks the same and nothing needs Math.random during render.
const timing = (i: number) => ({ dur: 10 + ((i * 7) % 11), begin: -((i * 5) % 13) })

function BackgroundBeamsBase() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-[1] overflow-hidden">
      <svg className="absolute inset-0 size-full" viewBox="0 0 696 316" fill="none" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(400 90)">
        {paths.map((d, i) => (
          <path key={`base-${i}`} d={d} stroke="white" strokeOpacity="0.09" strokeWidth="0.5" />
        ))}
        {paths.map((d, i) =>
          i % LIT_EVERY === 0 ? <path key={`lit-${i}`} d={d} stroke={`url(#beam-${i})`} strokeOpacity="0.9" strokeWidth="0.8" /> : null,
        )}
        </g>
        <defs>
          {paths.map((_, i) => {
            if (i % LIT_EVERY !== 0) return null
            const { dur, begin } = timing(i)
            return (
              <linearGradient key={`grad-${i}`} id={`beam-${i}`} gradientUnits="userSpaceOnUse" x1="0%" x2="0%" y1="0%" y2="0%">
                <animate attributeName="x1" values="0%;100%" dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
                <animate attributeName="x2" values="0%;105%" dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
                <animate attributeName="y1" values="0%;100%" dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
                <animate attributeName="y2" values="0%;120%" dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
                <stop stopColor="white" stopOpacity="0" />
                <stop stopColor="white" stopOpacity="0.9" />
                <stop offset="32.5%" stopColor="white" stopOpacity="0.5" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
            )
          })}
        </defs>
      </svg>
    </div>
  )
}

export const BackgroundBeams = memo(BackgroundBeamsBase)
