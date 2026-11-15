import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"

/**
 * The LXC wordmark as three letters that take turns (owner request 2026-11-15: "L -> X -> C -> L -> X -> C, in a loop" in the sidebar).
 * The letters are cut out of /lxc-wordmark.webp (400 x 79, the letters sit at x 0-115, 136-261 and 283-399), so no extra pictures are needed.
 *   row    the whole wordmark; the letters light up one after the other (the open sidebar)
 *   cycle  one letter at a time, each fading in and out in the same place (the narrow sidebar, where the wordmark does not fit)
 * Both stand still with "reduce motion" (lxc-letter in index.css).
 */
const SRC = "/lxc-wordmark.webp"
const FULL = { w: 400, h: 79 }
const LETTERS = [
  { name: "L", from: 0, to: 115 },
  { name: "X", from: 136, to: 261 },
  { name: "C", from: 283, to: 399 },
] as const

function letterStyle(from: number, to: number, scale: number, left: number | null, index: number): CSSProperties {
  return {
    width: (to - from + 1) * scale,
    height: FULL.h * scale,
    backgroundImage: `url(${SRC})`,
    backgroundSize: `${FULL.w * scale}px ${FULL.h * scale}px`,
    backgroundPosition: `${-from * scale}px 0`,
    backgroundRepeat: "no-repeat",
    ...(left === null ? {} : { left: left * scale, top: 0 }),
    animationDelay: `${index * 1.2}s`,
  }
}

export function LxcLetters({ mode, height, className }: { mode: "row" | "cycle"; height: number; className?: string }) {
  const scale = height / FULL.h
  if (mode === "row") {
    return (
      <span role="img" aria-label="LXC" className={cn("relative block shrink-0", className)} style={{ width: FULL.w * scale, height }}>
        {LETTERS.map((letter, index) => (
          <span key={letter.name} aria-hidden="true" className="lxc-letter lxc-letter-glow absolute" style={letterStyle(letter.from, letter.to, scale, letter.from, index)} />
        ))}
      </span>
    )
  }
  const width = (LETTERS[1].to - LETTERS[1].from + 1) * scale
  return (
    <span role="img" aria-label="LXC" className={cn("relative block shrink-0", className)} style={{ width, height }}>
      {LETTERS.map((letter, index) => {
        const letterWidth = (letter.to - letter.from + 1) * scale
        return (
          <span key={letter.name} aria-hidden="true" className="lxc-letter lxc-letter-swap absolute" style={{ ...letterStyle(letter.from, letter.to, scale, null, index), left: (width - letterWidth) / 2, top: 0 }} />
        )
      })}
    </span>
  )
}
