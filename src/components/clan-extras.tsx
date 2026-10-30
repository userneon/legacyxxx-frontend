import { useState } from "react"
import { Check, Coins, Crosshair, Flame, Medal, RotateCcw, Trophy, Users } from "lucide-react"
import { toast } from "sonner"

import { clansService } from "@/api"
import type { ClanDetail, ClanRole, ClanStatPerson, ClanStats } from "@/api/types"
import { clanFailure } from "@/components/clan-manage"
import { PlayerAvatar } from "@/components/player-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

export type ClanSection = "roster" | "stats" | "bank"

/** The staff-site kind colours, used on the clan sections so each kind of number reads apart at a glance (`.lx-tone`). */
type Tone = "red" | "amber" | "green" | "sky" | "violet" | "grey"
const TONE: Record<Tone, string> = { red: "var(--tone-red)", amber: "var(--tone-amber)", green: "var(--tone-green)", sky: "var(--tone-sky)", violet: "var(--tone-violet)", grey: "var(--text-faint)" }

/** A number in the stat grid with its own colour: a tinted label and a hairline along the top. */
function ToneCell({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return <div data-tone={tone} className="lx-tone lx-stat-cell"><span className="lx-stat-label lx-tone-text">{label}</span><span className="text-[22px] font-semibold leading-none">{value}</span></div>
}

/** The clan page's own sections under its header: Roster, Stats, and the Bank for members. */
export function ClanSectionTabs({ value, onChange, member }: { value: ClanSection; onChange: (next: ClanSection) => void; member: boolean }) {
  // Each section has its own colour (owner request 2026-10-25, "tell them apart by colour"): the icon, and the underline when open.
  const options: Array<{ value: ClanSection; label: string; Icon: typeof Users; tone: Tone }> = [
    { value: "roster", label: "Roster", Icon: Users, tone: "violet" },
    { value: "stats", label: "Stats", Icon: Trophy, tone: "amber" },
    ...(member ? [{ value: "bank" as const, label: "Bank", Icon: Coins, tone: "green" as const }] : []),
  ]
  return (
    <div role="tablist" aria-label="Clan sections" className="flex gap-1 overflow-x-auto border-b border-[var(--line-soft)] scrollbar-hidden">
      {options.map(({ value: option, label, Icon, tone }) => (
        <button key={option} type="button" role="tab" aria-selected={value === option} onClick={() => onChange(option)} style={{ "--tone": TONE[tone] } as React.CSSProperties} className={cn("relative inline-flex h-10 shrink-0 items-center gap-2 px-3 text-[13px] font-medium transition-colors", value === option ? "text-[var(--text)]" : "text-[var(--text-dim)] hover:text-[var(--text)]")}>
          <Icon className={cn("size-4", value === option ? "text-[var(--tone)]" : "opacity-70")} style={{ color: value === option ? undefined : "var(--tone)" }} aria-hidden="true" />
          {label}
          {value === option && <span aria-hidden="true" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--tone)]" />}
        </button>
      ))}
    </div>
  )
}

function Retry({ onRetry, text }: { onRetry: () => void; text: string }) {
  return <p className="flex items-center gap-3 py-8 text-[13px] text-[var(--text-dim)]">{text}<button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" aria-hidden="true" />Retry</button></p>
}

/** Level, XP to the next level and what the levels unlock. The fill is the EXP progress violet. */
function LevelCard({ progress }: { progress: ClanStats["progress"] }) {
  const span = progress.next === null ? 1 : progress.next - progress.floor
  const done = progress.next === null ? 1 : (progress.xp - progress.floor) / span
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-4">
      <div className="flex items-center gap-4">
        <span className={cn("grid size-14 shrink-0 place-items-center rounded-full border-2 text-[22px] font-bold", progress.level >= 15 ? "border-[var(--brand)] text-[var(--brand-bright)]" : progress.level >= 10 ? "border-[#fcd34d] text-[#fcd34d]" /* palette-exempt: gold level ring */ : progress.level >= 5 ? "border-[#d4d4d4] text-[var(--text)]" : "border-[var(--line-strong)] text-[var(--text)]")}>{progress.level}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-[15px] font-semibold">Level {progress.level}</span>
            <span className="text-[11px] text-[var(--text-dim)]">{progress.next === null ? `${progress.xp.toLocaleString()} XP · top level` : `${progress.xp.toLocaleString()} / ${progress.next.toLocaleString()} XP`}</span>
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-[var(--raised)]"><span className="block h-full rounded-full bg-[var(--brand)]" style={{ width: `${Math.round(Math.min(1, Math.max(0, done)) * 100)}%` }} /></span>
          <span className="text-[11px] text-[var(--text-dim)]">Members earn XP for the clan in ranked matches (win 25, draw 15, loss 10).</span>
        </div>
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {progress.perks.map((perk) => (
          <li key={perk.level} className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px]", perk.unlocked ? "border-[var(--line-strong)] text-[var(--text)]" : "border-[var(--line-soft)] text-[var(--text-faint)]")}>
            {perk.unlocked ? <Check className="size-3.5 shrink-0 text-[var(--status-green)]" aria-hidden="true" /> : <span className="w-3.5 shrink-0 text-center font-semibold">{perk.level}</span>}
            <span className="truncate">Level {perk.level}: {perk.perk}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Leader({ label, person, unit, tone, onOpen }: { label: string; person: ClanStatPerson | null; unit: string; tone: Tone; onOpen: (id: string) => void }) {
  return (
    <div data-tone={tone} className="lx-tone flex items-center gap-3 overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-3">
      {person ? (
        <button type="button" onClick={() => onOpen(person.steamId || person.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <PlayerAvatar avatar={person.avatar} name={person.name} className="size-10 shrink-0 rounded-[10px] text-sm" />
          <span className="flex min-w-0 flex-col">
            <span className="lx-tone-text text-[11px] font-semibold uppercase tracking-wide">{label}</span>
            <span className="truncate text-[13px] font-semibold">{person.name}</span>
            <span className="text-[11px] text-[var(--text-2)]">{person.value?.toLocaleString()} {unit}</span>
          </span>
        </button>
      ) : (
        <span className="flex flex-col"><span className="lx-tone-text text-[11px] font-semibold uppercase tracking-wide">{label}</span><span className="text-[13px] text-[var(--text-faint)]">No one yet</span></span>
      )}
    </div>
  )
}

/** Totals, the clan's best players and achievements, all from the members' own ranked matches. */
export function ClanStatsPanel({ clanId, onProfileNavigate }: { clanId: string; onProfileNavigate: (id: string) => void }) {
  const { data, loading, error, refetch } = useApiQuery<ClanStats>((signal) => clansService.getStats(clanId, { signal }), { queryKey: `clan-stats:${clanId}` })
  if (loading && !data) return <div className="flex flex-col gap-3"><Skeleton className="h-[150px] rounded-xl" /><Skeleton className="h-[72px] rounded-xl" /><Skeleton className="h-[200px] rounded-xl" /></div>
  if (error || !data) return <Retry onRetry={refetch} text="Could not load the clan's stats." />
  const t = data.totals
  const cells: Array<[string, string, Tone]> = [["Matches", t.matches.toLocaleString(), "sky"], ["Win rate", `${t.winRate}%`, "green"], ["Wins", t.wins.toLocaleString(), "green"], ["K/D", t.kd.toFixed(2), "violet"], ["Kills", t.kills.toLocaleString(), "red"], ["HS", `${t.headshotRate}%`, "red"], ["Aces", t.aces.toLocaleString(), "amber"], ["Clutches", t.clutches.toLocaleString(), "amber"]]
  return (
    <div className="flex flex-col gap-4">
      <LevelCard progress={data.progress} />
      <div className="lx-stat-grid grid-cols-2 sm:grid-cols-4">
        {cells.map(([label, value, tone]) => <ToneCell key={label} label={label} value={value} tone={tone} />)}
      </div>
      {t.matches === 0 && <p className="text-[13px] text-[var(--text-dim)]">No ranked matches by members since they joined yet.</p>}
      <section className="flex flex-col gap-2.5">
        <h2 className="lx-shop-heading">Best players</h2>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Leader label="MVP this week" person={data.leaders.weekMvp} unit="EXP" tone="amber" onOpen={onProfileNavigate} />
          <Leader label="Most kills" person={data.leaders.kills} unit="kills" tone="red" onOpen={onProfileNavigate} />
          <Leader label="Best K/D" person={data.leaders.kd} unit="K/D" tone="violet" onOpen={onProfileNavigate} />
          <Leader label="Most wins" person={data.leaders.wins} unit="wins" tone="green" onOpen={onProfileNavigate} />
        </div>
      </section>
      <section className="flex flex-col gap-2.5">
        <h2 className="lx-shop-heading">Achievements</h2>
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {data.achievements.map((entry) => (
            <li key={entry.id} data-tone={entry.tier > 0 ? ACHIEVEMENT_TONE[entry.id] ?? "violet" : "grey"} className="lx-tone flex items-center gap-3 overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-3">
              <span className="lx-tone-icon grid size-10 shrink-0 place-items-center rounded-[10px] border"><Medal className="size-4" aria-hidden="true" /></span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-baseline justify-between gap-2"><span className="truncate text-[13px] font-semibold">{entry.title}</span><span className="shrink-0 text-[11px] text-[var(--text-dim)]">Tier {entry.tier}/{entry.tiers}</span></span>
                <span className="h-1.5 overflow-hidden rounded-full bg-[var(--raised)]"><span className="lx-tone-fill block h-full rounded-full" style={{ width: `${entry.complete ? 100 : Math.round(Math.min(1, entry.value / entry.goal) * 100)}%` }} /></span>
                <span className="text-[11px] text-[var(--text-dim)]">{entry.complete ? `Done · ${entry.value.toLocaleString()}` : `${entry.value.toLocaleString()} / ${entry.goal.toLocaleString()}`}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/** Achievement colours by ladder; one not started yet stays grey. */
const ACHIEVEMENT_TONE: Record<string, Tone> = { wins: "green", matches: "sky", aces: "amber", clutches: "amber", level: "violet", members: "violet" }

/** Members give LX to the clan; the leader spends it on member slots. */
export function ClanBankPanel({ clan, role, onChanged, onProfileNavigate }: { clan: ClanDetail; role: ClanRole | null; onChanged: () => void; onProfileNavigate: (id: string) => void }) {
  const { data, loading, error, refetch } = useApiQuery((signal) => clansService.getBank(clan.id, { signal }), { queryKey: `clan-bank:${clan.id}` })
  const [amount, setAmount] = useState(100)
  const [busy, setBusy] = useState(false)
  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true)
    try {
      await action()
      toast.success(done)
      void refetch()
      onChanged()
    } catch (failure) {
      toast.error("That did not work", { description: clanFailure(failure, "Try again in a moment.") })
    } finally {
      setBusy(false)
    }
  }
  if (loading && !data) return <div className="flex flex-col gap-3"><Skeleton className="h-[120px] rounded-xl" /><Skeleton className="h-[160px] rounded-xl" /></div>
  if (error || !data) return <Retry onRetry={refetch} text="Could not load the clan bank." />
  const valid = Number.isInteger(amount) && amount >= 10 && amount <= 100_000
  return (
    <div className="flex flex-col gap-4">
      <section data-tone="green" className="lx-tone flex flex-wrap items-end gap-4 overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-4">
        <div className="flex min-w-[140px] flex-1 flex-col gap-1">
          <span className="lx-stat-label lx-tone-text">Clan bank</span>
          <span className="flex items-center gap-2 text-[22px] font-semibold leading-none"><Coins className="lx-tone-text size-5" aria-hidden="true" />{data.balance.toLocaleString()} LX</span>
          <span className="text-[11px] text-[var(--text-dim)]">Given by members. The leader spends it on the clan.</span>
        </div>
        <form className="flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); if (valid) void run(() => clansService.donate(clan.id, amount), `You gave ${amount.toLocaleString()} LX`) }}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bank-amount">Give LX</Label>
            <Input id="bank-amount" type="number" min={10} max={100000} step={10} value={amount} onChange={(event) => setAmount(Math.floor(Number(event.target.value) || 0))} className="w-28" />
          </div>
          <button type="submit" disabled={busy || !valid} className="lx-primary-button inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-semibold disabled:opacity-50">Give</button>
        </form>
        {role === "leader" && (
          <button type="button" disabled={busy || data.balance < data.slotPrice} onClick={() => void run(() => clansService.buySlots(clan.id, "bank"), "Two more member slots")} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] hover:border-[var(--line-strong)] disabled:opacity-50">
            <Users className="size-4" aria-hidden="true" />+2 slots · {data.slotPrice.toLocaleString()} LX from the bank
          </button>
        )}
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-2.5">
          <h2 className="lx-shop-heading">Top givers</h2>
          {data.donors.length ? (
            <ol className="flex flex-col gap-1.5">
              {data.donors.map((donor, index) => (
                <li key={donor.id}>
                  <button type="button" data-tone={index === 0 ? "amber" : index < 3 ? "violet" : "grey"} onClick={() => onProfileNavigate(donor.steamId || donor.id)} className="lx-tone flex w-full items-center gap-3 overflow-hidden rounded-lg border border-[var(--line-soft)] p-2 text-left transition-colors hover:bg-[var(--raised)]">
                    <span className="lx-tone-text w-5 text-center text-[13px] font-semibold">{index + 1}</span>
                    <PlayerAvatar avatar={donor.avatar} name={donor.name} className="size-8 rounded-lg text-xs" />
                    <span className="min-w-0 flex-1 truncate text-[13px]">{donor.name}</span>
                    <span className="text-[13px] font-semibold">{donor.total.toLocaleString()} LX</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : <p className="text-[13px] text-[var(--text-dim)]">Nobody has given yet.</p>}
        </section>
        <section className="flex flex-col gap-2.5">
          <h2 className="lx-shop-heading">Latest</h2>
          {data.log.length ? (
            <ul className="flex flex-col divide-y divide-[var(--line-soft)] rounded-xl border border-[var(--glass-line)]">
              {data.log.map((entry, index) => (
                <li key={index} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                  {entry.amount > 0 ? <Flame className="size-3.5 shrink-0 text-[var(--tone-green)]" aria-hidden="true" /> : <Crosshair className="size-3.5 shrink-0 text-[var(--tone-red)]" aria-hidden="true" />}
                  <span className="min-w-0 flex-1 truncate">{entry.amount > 0 ? `${entry.name ?? "A member"} gave` : `Spent on ${entry.reason}`}</span>
                  <span className={cn("shrink-0 font-semibold", entry.amount > 0 ? "text-[var(--tone-green)]" : "text-[var(--tone-red)]")}>{entry.amount > 0 ? "+" : "−"}{Math.abs(entry.amount).toLocaleString()}</span>
                  <span className="shrink-0 text-[11px] text-[var(--text-faint)]">{new Date(entry.at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-[13px] text-[var(--text-dim)]">Nothing yet.</p>}
        </section>
      </div>
    </div>
  )
}
