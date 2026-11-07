import { ArrowRight, Star } from "lucide-react"

import type { ExpBreakdown, ProfileMatchRow } from "@/api/profile-overview"
import { CompetitiveRankBadge } from "@/components/competitive-rank-badge"
import { cn } from "@/lib/utils"

/** What each part of the EXP change means, in a few words (RANK-SYSTEM.md section 1). */
const PARTS: Array<{ key: "result" | "margin" | "performance" | "bonus"; label: string; hint: string }> = [
  { key: "result", label: "Result", hint: "Win, draw or loss, against what the two teams' average EXP expected" },
  { key: "margin", label: "Margin", hint: "How far ahead or behind the rounds ended" },
  { key: "performance", label: "Performance", hint: "How you played compared with everyone in the match" },
  { key: "bonus", label: "Bonus", hint: "An ace, a big clutch or the best player" },
]

/** Why the formula was not applied, when it was not. */
const RULES: Record<NonNullable<ExpBreakdown["rule"]>, string> = {
  leaver: "You left the match and did not come back: a flat −10, counted as a loss. What you did before leaving is added.",
  invalid_match: "This match did not count (too few players or rounds), so no EXP changed.",
  low_participation: "You played less than half of the rounds, so no EXP changed.",
  fun_mode: "Fun servers never change EXP.",
}

const sign = (value: number) => (value > 0 ? "+" : value < 0 ? "−" : "")
const amount = (value: number) => Math.abs(Math.round(value * 10) / 10).toLocaleString()
const tone = (value: number) => (value > 0 ? "text-[var(--result-win)]" : value < 0 ? "text-[var(--result-loss)]" : "text-[var(--text-dim)]")

/**
 * How one match's EXP was worked out (owner request 2026-11-07, "there is no EXP calculation card"): the change, the EXP and rank before and after,
 * and each part of the formula. Every number comes from the API (`expBreakdown`, `expDelta`, `expBefore`, `expAfter`); a part the API did not keep
 * is left out, never filled in.
 */
export function ExpCalculation({ match, className }: { match: ProfileMatchRow; className?: string }) {
  const delta = match.expDelta
  if (typeof delta !== "number") return null
  const breakdown = match.expBreakdown ?? null
  const parts = PARTS.filter((part) => typeof breakdown?.[part.key] === "number")
  const rankChanged = Boolean(match.rankBefore && match.rankAfter && match.rankBefore.id !== match.rankAfter.id)
  const limited = breakdown?.limited
  return (
    <section aria-label="EXP calculation" className={cn("flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-black/45 p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">EXP calculation</span>
          <span className="flex items-baseline gap-2">
            <span className={cn("text-[26px] font-bold leading-none", tone(delta))}>{sign(delta)}{amount(delta)}</span>
            <span className="text-[13px] text-[var(--text-dim)]">EXP</span>
            {breakdown?.calibration === 2 && <span title="Your first ranked matches count double" className="rounded-md border border-white/10 px-1.5 py-px text-[11px] font-semibold text-[var(--text-2)]">×2 calibration</span>}
          </span>
        </div>
        {typeof match.expBefore === "number" && typeof match.expAfter === "number" && (
          <div className="flex items-center gap-2 text-[13px] text-[var(--text-2)]">
            {rankChanged && match.rankBefore && <CompetitiveRankBadge rankId={match.rankBefore.id} rankName={match.rankBefore.name} imageKey={match.rankBefore.imageKey} size={26} />}
            <span>{Math.round(match.expBefore).toLocaleString()}</span>
            <ArrowRight className="size-3.5 text-[var(--text-dim)]" aria-hidden="true" />
            <span className="font-semibold text-[var(--text)]">{Math.round(match.expAfter).toLocaleString()}</span>
            {rankChanged && match.rankAfter && <CompetitiveRankBadge rankId={match.rankAfter.id} rankName={match.rankAfter.name} imageKey={match.rankAfter.imageKey} size={26} />}
          </div>
        )}
      </div>

      {breakdown?.rule && <p className="text-[12px] leading-relaxed text-[var(--text-dim)]">{RULES[breakdown.rule]}</p>}

      {parts.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {parts.map((part) => {
            const value = breakdown![part.key] as number
            return (
              <li key={part.key} title={part.hint} className="flex flex-col gap-0.5 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                <span className="text-[11px] text-[var(--text-dim)]">{part.label}</span>
                <span className={cn("text-[15px] font-semibold", tone(value))}>{sign(value)}{amount(value)}</span>
              </li>
            )
          })}
        </ul>
      )}

      {(breakdown?.mvp || breakdown?.shortHanded || limited) && (
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          {breakdown?.mvp && <span className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-[var(--text-2)]"><Star className="size-3" aria-hidden="true" />Best player of the match</span>}
          {breakdown?.shortHanded && <span className="rounded-md border border-white/10 px-2 py-0.5 text-[var(--text-2)]">Your team played a man down: a loss counts half</span>}
          {limited && (
            <span className="rounded-md border border-[var(--status-red)]/40 bg-[var(--status-red)]/10 px-2 py-0.5 font-medium text-[var(--status-red)]">
              {limited === "daily" ? "Daily limit: gains past 150 EXP a day count for a quarter" : "Weekly limit reached: no more EXP until Monday"}
            </span>
          )}
        </div>
      )}

      {!breakdown && <p className="text-[12px] text-[var(--text-dim)]">No breakdown was kept for this match.</p>}
    </section>
  )
}
