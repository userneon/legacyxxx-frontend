import { useEffect, useState } from "react"

import type { PlayerCheck } from "@/api/checks"
import { cn } from "@/lib/utils"
import "./checks.css"

/** How a check reads at a glance. It is a pointer for a person, never a verdict. */
export type Threat = "waiting" | "expired" | "clear" | "review" | "flagged"

export function threatOf(check: PlayerCheck): Threat {
  if (check.status === "pending") return "waiting"
  if (check.status === "expired") return "expired"
  const summary = check.summary
  if (!summary) return "clear"
  if (summary.detections > 0 || (summary.bannedAccounts ?? 0) > 0) return "flagged"
  return summary.suspicions > 0 ? "review" : "clear"
}

const THREAT: Record<Threat, { label: string; tone: string; dot: string }> = {
  waiting: { label: "WAITING", tone: "border-[var(--line-strong)] text-[var(--text-2)]", dot: "bg-[var(--text-2)] chk-caret" },
  expired: { label: "EXPIRED", tone: "border-[var(--line)] text-[var(--text-faint)]", dot: "bg-[var(--text-faint)]" },
  clear: { label: "CLEAR", tone: "border-[var(--status-green)]/45 text-[var(--status-green)]", dot: "bg-[var(--status-green)]" },
  review: { label: "REVIEW", tone: "border-[var(--line-strong)] text-[var(--text)]", dot: "bg-[var(--text)]" },
  flagged: { label: "FLAGGED", tone: "border-[var(--status-red)]/55 bg-[var(--status-red)]/10 text-[var(--status-red)]", dot: "bg-[var(--status-red)]" },
}

export function ThreatBadge({ threat, className }: { threat: Threat; className?: string }) {
  const item = THREAT[threat]
  return (
    <span className={cn("inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-md border px-2 font-mono text-[10px] font-semibold tracking-[1.4px]", item.tone, className)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", item.dot)} />
      {item.label}
    </span>
  )
}

/** Twelve small bars: red for detections and banned accounts, white for suspicions, one green bar when all is clear. */
export function RiskMeter({ detections, suspicions, banned = 0, className }: { detections: number; suspicions: number; banned?: number; className?: string }) {
  const hard = detections + banned
  const score = Math.min(12, hard * 4 + suspicions)
  const clear = hard === 0 && suspicions === 0
  return (
    <span className={cn("inline-flex items-center gap-[3px]", className)} role="img" aria-label={clear ? "Nothing found" : `${hard} serious, ${suspicions} to look at`}>
      {Array.from({ length: 12 }, (_, index) => {
        const on = index < score
        const kind = clear ? (index === 0 ? "ok" : "off") : !on ? "off" : index < hard * 4 ? "danger" : "warn"
        return <i key={index} className="chk-seg" data-on={kind} />
      })}
    </span>
  )
}

/** Types its text out one letter at a time (all at once for anyone who asked for less motion). */
export function useTyped(text: string, speed = 20) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setCount(text.length); return }
    setCount(0)
    const timer = window.setInterval(() => setCount((value) => (value >= text.length ? value : value + 1)), speed)
    return () => window.clearInterval(timer)
  }, [text, speed])
  return text.slice(0, count)
}

/** A line of the console: a prompt, text that types itself, and a blinking cursor. */
export function PromptLine({ text, className, cursor = true }: { text: string; className?: string; cursor?: boolean }) {
  const typed = useTyped(text)
  return (
    <p className={cn("font-mono", className)}>
      <span className="text-[var(--chk-accent)]">&gt;</span> {typed}
      {cursor && <span aria-hidden="true" className="chk-caret ml-0.5 text-[var(--chk-accent)]">▌</span>}
    </p>
  )
}

/** A number in a HUD tile: label on top, big figure under it. */
export function HudTile({ label, value, tone }: { label: string; value: number; tone?: "danger" | "ok" }) {
  return (
    <div className="chk-panel chk-tile flex flex-col gap-1.5">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[1.6px] text-[var(--text-faint)]">{label}</span>
      <span className={cn("font-mono text-[30px] font-semibold leading-none", tone === "danger" ? "text-[var(--status-red)]" : tone === "ok" ? "text-[var(--status-green)]" : "text-[var(--text)]")}>{String(value).padStart(2, "0")}</span>
    </div>
  )
}

/** The lines of a result, like a terminal: [!!] for detections, [ ? ] for suspicions. */
export function LogLines({ lines }: { lines: Array<{ level: "detection" | "suspicion" | "info"; name: string; kind?: string; detail?: string }> }) {
  return (
    <ul className="chk-log flex flex-col gap-2 p-3 font-mono text-[12px] leading-[18px]">
      {lines.map((line, index) => (
        <li key={`${line.name}:${index}`} className="flex gap-2.5">
          <span className={cn("shrink-0", line.level === "detection" ? "text-[var(--status-red)]" : line.level === "suspicion" ? "text-[var(--text-2)]" : "text-[var(--status-green)]")}>{line.level === "detection" ? "[!!]" : line.level === "suspicion" ? "[ ? ]" : "[ ok]"}</span>
          <span className="min-w-0 flex-1">
            <span className="break-words text-[var(--text)]">{line.name}</span>
            {line.kind && <span className="ml-2 text-[var(--text-faint)]">{line.kind}</span>}
            {line.detail && <span className="block break-words text-[var(--text-dim)]">{line.detail}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}
