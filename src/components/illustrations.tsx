import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Pictures drawn in code (owner request 2026-11-18: "not agents; make the things drawn by code special"): thin white lines, one soft blue and one gold accent,
 * and a very slow float. They stand in for the empty and error states. Every picture is 160 x 120 and scales with `className`.
 */
export type IllustrationKind = "box" | "signal" | "shield" | "bell" | "trophy" | "search" | "cart" | "link"

const LINE = "rgb(255 255 255 / 0.55)"
const SOFT = "rgb(255 255 255 / 0.22)"
const BLUE = "rgb(150 180 255)"
const GOLD = "rgb(230 192 103)"

function Frame({ children, id }: { children: ReactNode; id: string }) {
  return (
    <svg viewBox="0 0 160 120" fill="none" aria-hidden="true" className="h-full w-full overflow-visible" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <radialGradient id={`${id}-pool`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor={BLUE} stopOpacity="0.28" /><stop offset="1" stopColor={BLUE} stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-accent`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={BLUE} /><stop offset="1" stopColor={GOLD} /></linearGradient>
      </defs>
      <ellipse cx="80" cy="102" rx="56" ry="9" fill={`url(#${id}-pool)`} />
      <ellipse cx="80" cy="102" rx="34" ry="3.5" stroke={SOFT} strokeWidth="1" />
      {children}
    </svg>
  )
}

const Spark = ({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) => (
  <path className="lx-ill-twinkle" style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px` }} d={`M${x} ${y - 4}V${y + 4}M${x - 4} ${y}H${x + 4}`} stroke={GOLD} strokeWidth="1.4" />
)

const SCENES: Record<IllustrationKind, (id: string) => ReactNode> = {
  // An open box with a few things rising out of it, none of them there yet.
  box: (id) => (
    <Frame id={id}>
      <g className="lx-ill-float">
        <path d="M44 56 80 44l36 12v30L80 98 44 86Z" stroke={LINE} strokeWidth="1.6" />
        <path d="M44 56 80 68l36-12M80 68v30" stroke={LINE} strokeWidth="1.6" />
        <path d="M44 56 32 48l36-12 12 8M116 56l12-8-36-12-12 8" stroke={SOFT} strokeWidth="1.4" />
        <path d="M80 68v30" stroke={`url(#${id}-accent)`} strokeWidth="2" />
        <circle cx="70" cy="30" r="2.5" stroke={BLUE} strokeWidth="1.4" /><circle cx="92" cy="22" r="1.8" stroke={GOLD} strokeWidth="1.4" /><circle cx="82" cy="12" r="1.3" fill={BLUE} />
      </g>
      <Spark x={122} y={30} /><Spark x={36} y={24} delay={1.4} />
    </Frame>
  ),
  // A signal with a gap in it.
  signal: (id) => (
    <Frame id={id}>
      <g className="lx-ill-float">
        <path d="M38 60a60 60 0 0 1 36-22M122 60a60 60 0 0 0-14-17" stroke={LINE} strokeWidth="1.6" />
        <path d="M54 74a38 38 0 0 1 20-13M106 74a38 38 0 0 0-9-9" stroke={LINE} strokeWidth="1.6" />
        <path d="M70 88a16 16 0 0 1 8-3M90 88a16 16 0 0 0-4-3" stroke={`url(#${id}-accent)`} strokeWidth="2" />
        <circle cx="80" cy="96" r="3.2" fill={GOLD} />
        <path d="m92 36-8 14h10l-8 14" stroke={GOLD} strokeWidth="1.8" />
      </g>
      <Spark x={30} y={34} delay={0.8} />
    </Frame>
  ),
  // A shield with a check, a ring that slowly breathes.
  shield: (id) => (
    <Frame id={id}>
      <circle className="lx-ill-ring" cx="80" cy="56" r="40" stroke={BLUE} strokeWidth="1" />
      <g className="lx-ill-float">
        <path d="M80 22 108 32v22c0 18-12 30-28 38C64 84 52 72 52 54V32Z" stroke={LINE} strokeWidth="1.8" />
        <path d="M80 30 100 38v16c0 13-8 22-20 29" stroke={SOFT} strokeWidth="1.2" />
        <path d="m68 56 9 9 17-19" stroke={`url(#${id}-accent)`} strokeWidth="3" />
      </g>
      <Spark x={118} y={26} /><Spark x={40} y={70} delay={1.6} />
    </Frame>
  ),
  // A bell asleep.
  bell: (id) => (
    <Frame id={id}>
      <g className="lx-ill-float">
        <path d="M56 78c4-6 5-12 5-22 0-12 8-20 19-20s19 8 19 20c0 10 1 16 5 22Z" stroke={LINE} strokeWidth="1.8" />
        <path d="M72 82a8 8 0 0 0 16 0" stroke={SOFT} strokeWidth="1.6" />
        <path d="M80 30v6" stroke={LINE} strokeWidth="1.6" />
        <path d="M100 30h9l-9 10h9" stroke={GOLD} strokeWidth="1.6" /><path d="M112 20h6l-6 7h6" stroke={GOLD} strokeWidth="1.3" opacity="0.7" />
      </g>
    </Frame>
  ),
  // An empty cup on a plinth.
  trophy: (id) => (
    <Frame id={id}>
      <g className="lx-ill-float">
        <path d="M60 30h40v18c0 12-9 20-20 20s-20-8-20-20Z" stroke={LINE} strokeWidth="1.8" />
        <path d="M60 36H48c0 10 4 16 13 18M100 36h12c0 10-4 16-13 18" stroke={SOFT} strokeWidth="1.6" />
        <path d="M80 68v12M66 90h28M70 80h20v10H70Z" stroke={LINE} strokeWidth="1.6" />
        <path d="m80 38 3.2 6.5 7.2 1-5.2 5 1.3 7.1L80 54.200l-6.500 3.400 1.300-7.100-5.200-5 7.200-1Z" stroke={`url(#${id}-accent)`} strokeWidth="1.4" opacity="0.8" />
      </g>
      <Spark x={118} y={34} delay={0.6} />
    </Frame>
  ),
  // A magnifier over a dotted field.
  search: (id) => (
    <Frame id={id}>
      <g fill={SOFT}>{[0, 1, 2, 3, 4].flatMap((r) => [0, 1, 2, 3, 4, 5, 6].map((c) => <circle key={`${r}-${c}`} cx={38 + c * 14} cy={30 + r * 13} r="1.1" />))}</g>
      <g className="lx-ill-float">
        <circle cx="74" cy="54" r="22" stroke={LINE} strokeWidth="1.8" fill="rgb(8 9 14 / 0.6)" />
        <path d="m90 70 18 18" stroke={`url(#${id}-accent)`} strokeWidth="4" />
        <path d="M64 46a14 14 0 0 1 12-6" stroke={SOFT} strokeWidth="1.6" />
      </g>
    </Frame>
  ),
  // A cart with nothing in it.
  cart: (id) => (
    <Frame id={id}>
      <g className="lx-ill-float">
        <path d="M38 34h14l8 40h44l8-30H56" stroke={LINE} strokeWidth="1.8" />
        <circle cx="68" cy="88" r="5" stroke={SOFT} strokeWidth="1.6" /><circle cx="102" cy="88" r="5" stroke={SOFT} strokeWidth="1.6" />
        <path d="M70 58h28" stroke={`url(#${id}-accent)`} strokeWidth="1.6" strokeDasharray="3 5" />
      </g>
      <Spark x={120} y={30} delay={1} />
    </Frame>
  ),
  // Two links, not joined.
  link: (id) => (
    <Frame id={id}>
      <g className="lx-ill-float">
        <rect x="34" y="46" width="48" height="24" rx="12" stroke={LINE} strokeWidth="1.8" />
        <rect x="78" y="46" width="48" height="24" rx="12" stroke={`url(#${id}-accent)`} strokeWidth="1.8" strokeDasharray="4 5" />
        <path d="M74 58h12" stroke={GOLD} strokeWidth="1.6" />
      </g>
      <Spark x={80} y={30} delay={0.5} />
    </Frame>
  ),
}

export function Illustration({ kind, className, title }: { kind: IllustrationKind; className?: string; title?: string }) {
  return <span role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} className={cn("lx-ill block h-[120px] w-[160px] shrink-0", className)}>{SCENES[kind](`ill-${kind}`)}</span>
}
