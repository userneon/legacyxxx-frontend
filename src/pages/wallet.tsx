import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowUp, Clock, Flame, Gavel, RotateCcw, ShoppingBag, Trophy, Users } from "lucide-react"

import { walletService, type Wallet, type WalletTransaction } from "@/api"
import { AnimatedNumber } from "@/components/animated-number"
import { LxMark } from "@/components/lx-mark"
import { PageBar, PageTabs } from "@/components/page-tabs"
import { RelativeTime } from "@/components/relative-time"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

type Tab = "overview" | "history" | "earn"
type Filter = "all" | "earned" | "spent"

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "history", label: "History" },
  { value: "earn", label: "How to earn" },
]

const label = "text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]"
const card = "rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]"

const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"]

function dayLetter(day: string) {
  return WEEKDAY[new Date(`${day}T00:00:00Z`).getUTCDay()]
}

/** Tile icon for a ledger line: what it was, not just its sign. */
function lineIcon(entry: WalletTransaction) {
  const reason = entry.reason.toLowerCase()
  if (entry.kind === "penalty") return <Gavel className="size-4" aria-hidden="true" />
  if (entry.amount < 0) return <ShoppingBag className="size-4" aria-hidden="true" />
  if (reason.includes("in a row")) return <Flame className="size-4" aria-hidden="true" />
  if (reason.includes("rank") && !reason.includes("match")) return <Trophy className="size-4" aria-hidden="true" />
  if (reason.includes("first win")) return <Trophy className="size-4" aria-hidden="true" />
  return <ArrowUp className="size-4" aria-hidden="true" />
}

function Activity({ entries, empty }: { entries: WalletTransaction[]; empty: string }) {
  if (entries.length === 0) return <p className="p-4 text-[13px] text-[var(--text-dim)]">{empty}</p>
  return (
    <ul>
      {entries.map((entry) => {
        const gain = entry.amount > 0
        return (
          <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className={cn("grid size-[34px] shrink-0 place-items-center rounded-[9px] border", gain ? "border-[var(--status-green)]/30 bg-[var(--status-green)]/10 text-[var(--status-green)]" : "border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)]")}>{lineIcon(entry)}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[13px] font-semibold text-[var(--text)]" title={entry.reason}>{entry.reason}</span>
              <RelativeTime value={entry.at} className="text-[11px] text-[var(--text-dim)]" />
            </span>
            <span className="flex flex-col items-end gap-0.5">
              <span className={cn("text-sm font-bold", gain ? "text-[var(--status-green)]" : entry.kind === "penalty" ? "text-[var(--status-red)]" : "text-[var(--text)]")}>{gain ? "+" : "−"}{Math.abs(entry.amount).toLocaleString()} LX</span>
              <span className="text-[11px] text-[var(--text-dim)]">{entry.balanceAfter.toLocaleString()}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function Chips({ value, onChange }: { value: Filter; onChange: (next: Filter) => void }) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Filter">
      {(["all", "earned", "spent"] as const).map((entry) => (
        <button key={entry} type="button" aria-pressed={value === entry} onClick={() => onChange(entry)} className={cn("inline-flex h-[26px] items-center rounded-full border px-2.5 text-xs capitalize transition-colors", value === entry ? "border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-dim)] hover:text-[var(--text)]")}>{entry}</button>
      ))}
    </div>
  )
}

/** The last 14 days of earnings as bars: today in green, quiet days as a thin line. */
function EarningsChart({ daily }: { daily: Array<{ day: string; earned: number }> }) {
  const max = Math.max(1, ...daily.map((entry) => entry.earned))
  const total = daily.reduce((sum, entry) => sum + entry.earned, 0)
  return (
    <section className={cn(card, "flex flex-col gap-3 p-4")} aria-label="Earned in the last 14 days">
      <div className="flex items-center">
        <span className={label}>Earned · last 14 days</span>
        <span className="ml-auto text-xs text-[var(--text-muted)]">Total <b className="text-[var(--text)]">+{total.toLocaleString()} LX</b></span>
      </div>
      <div className="flex h-[120px] items-end gap-2" role="img" aria-label={`${total} LX earned in the last 14 days`}>
        {daily.map((entry, index) => (
          <div key={entry.day} className="flex h-full flex-1 items-end" title={`${entry.day}: +${entry.earned} LX`}>
            <div
              className={cn("w-full rounded-[4px]", entry.earned === 0 ? "bg-[var(--line)]" : index === daily.length - 1 ? "bg-[var(--status-green)]" : "bg-[var(--line-strong)]")}
              style={{ height: entry.earned === 0 ? 3 : `${Math.max(8, (entry.earned / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-[var(--text-faint)]"><span>14 days ago</span><span>Today</span></div>
    </section>
  )
}

export function WalletPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>("overview")
  const [filter, setFilter] = useState<Filter>("all")
  const { data: wallet, loading, error, refetch } = useApiQuery<Wallet>((signal) => walletService.getMine({ signal }), { enabled: Boolean(user), queryKey: user ? `wallet:${user.id}` : "wallet:guest" })

  const entries = useMemo(() => (wallet?.transactions ?? []).filter((entry) => filter === "all" || (filter === "earned" ? entry.amount > 0 : entry.amount < 0)), [wallet, filter])
  const summary = wallet?.summary ?? null

  const earnRules = (
    <section className={cn(card, "flex flex-col overflow-hidden")} aria-label="How to earn">
      <div className="px-4 py-3"><span className={label}>How to earn</span></div>
      {(wallet?.earn ?? []).map((rule) => (
        <div key={rule.id} className="flex h-11 items-center gap-3 border-t border-[var(--line-soft)] px-4 text-[13px]">
          <span className="grid size-[34px] shrink-0 place-items-center rounded-[9px] border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)]">{rule.id.startsWith("streak") ? <Flame className="size-4" aria-hidden="true" /> : <ArrowUp className="size-4" aria-hidden="true" />}</span>
          <span className="min-w-0 flex-1 truncate">{rule.label}</span>
          <b className="text-[var(--text)]">+{rule.coins}</b>
        </div>
      ))}
      <p className="border-t border-[var(--line-soft)] px-4 py-3 text-[11px] text-[var(--text-dim)]">Past the daily EXP limit you earn a quarter; past the weekly limit, nothing.</p>
    </section>
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageBar>
        <PageTabs<Tab> ariaLabel="Wallet sections" value={tab} onChange={setTab} options={TABS} />
      </PageBar>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 max-md:px-4">
        {loading && !wallet ? (
          <div className="grid gap-5 lg:grid-cols-[440px_minmax(0,1fr)]"><Skeleton className="h-[236px] rounded-2xl" /><Skeleton className="h-[236px] rounded-xl" /></div>
        ) : error || !wallet ? (
          <p className="flex items-center justify-center gap-3 py-24 text-[13px] text-[var(--text-dim)]">Could not load your wallet.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
        ) : tab === "history" ? (
          <section className={cn(card, "max-w-3xl overflow-hidden")}>
            <div className="flex items-center gap-2 border-b border-[var(--line-soft)] px-4 py-3"><span className={cn(label, "mr-auto")}>History</span><Chips value={filter} onChange={setFilter} /></div>
            <Activity entries={entries} empty="Nothing here yet." />
            <p className="border-t border-[var(--line-soft)] px-4 py-2.5 text-xs text-[var(--text-dim)]">Your latest {wallet.transactions.length} entries.</p>
          </section>
        ) : tab === "earn" ? (
          <div className="max-w-xl">{earnRules}</div>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[440px_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-3.5">
              <section
                aria-label="Balance"
                className="relative flex h-[236px] flex-col overflow-hidden rounded-2xl border border-[var(--line-strong)] p-6"
                style={{ backgroundImage: "radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,.16), transparent 55%), repeating-linear-gradient(115deg, rgba(255,255,255,.035) 0 1px, transparent 1px 9px), linear-gradient(160deg, #1d1d1f, #0e0e0f)" }}
              >
                <span aria-hidden="true" className="absolute -bottom-[90px] -right-[70px] size-[300px] rounded-full border border-white/[0.07] shadow-[0_0_0_26px_rgba(255,255,255,.02),0_0_0_54px_rgba(255,255,255,.015)]" />
                <div className="relative flex items-center justify-between">
                  <span className="flex items-center gap-2.5 font-bold tracking-[0.4px]"><LxMark size={30} />LX WALLET</span>
                  <span className="text-[11px] tracking-[1.4px] text-[var(--text-muted)]">LEGACY-X</span>
                </div>
                <div className="relative mt-auto">
                  <span className="text-xs font-semibold tracking-[1.2px] text-[var(--text-muted)]">BALANCE</span>
                  <div className="mt-0.5 flex items-baseline gap-2.5"><span className="text-[54px] font-bold leading-none tracking-[-1.6px]"><AnimatedNumber value={wallet.balance} durationMs={700} /></span><span className="text-xl font-bold text-[var(--text-2)]">LX</span></div>
                </div>
                <div className="relative mt-4 flex items-center gap-2.5 text-[13px] font-semibold">
                  <span className="truncate">{user?.username}</span>
                  {summary && summary.todayEarned > 0 && <span className="ml-auto text-[11px] text-[var(--status-green)]">+{summary.todayEarned.toLocaleString()} today</span>}
                </div>
              </section>

              <div className="flex gap-2">
                {[{ label: "Shop", icon: ShoppingBag, to: "/shop" }, { label: "Clan", icon: Users, to: "/clans" }, { label: "History", icon: Clock, to: "" }].map((action) => (
                  <button key={action.label} type="button" onClick={() => (action.to ? navigate(action.to) : setTab("history"))} className="flex h-[60px] flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--glass-fill)] text-xs font-semibold text-[var(--text-2)] transition-colors hover:bg-[var(--raised)]">
                    <action.icon className="size-5 opacity-80" aria-hidden="true" />{action.label}
                  </button>
                ))}
              </div>

              {summary && (
                <>
                  <div className={cn(card, "grid grid-cols-3 divide-x divide-[var(--line-soft)]")}>
                    {[
                      { name: "Today", value: `+${summary.todayEarned.toLocaleString()}`, hint: `${summary.todayMatches} ${summary.todayMatches === 1 ? "match" : "matches"}`, green: summary.todayEarned > 0 },
                      { name: "This week", value: `+${summary.weekEarned.toLocaleString()}`, hint: `${summary.weekMatches} ${summary.weekMatches === 1 ? "match" : "matches"}`, green: false },
                      { name: "Spent", value: summary.spentTotal.toLocaleString(), hint: `${summary.spentCount} ${summary.spentCount === 1 ? "purchase" : "purchases"}`, green: false },
                    ].map((stat) => (
                      <div key={stat.name} className="flex flex-col gap-1 px-4 py-3.5">
                        <span className={label}>{stat.name}</span>
                        <b className={cn("text-[22px] leading-none", stat.green && "text-[var(--status-green)]")}>{stat.value}</b>
                        <span className="text-[11px] text-[var(--text-dim)]">{stat.hint}</span>
                      </div>
                    ))}
                  </div>
                  <section className={cn(card, "flex flex-col gap-2.5 p-4")} aria-label="Play streak">
                    <div className="flex items-center gap-2"><Flame className="size-4 text-[var(--text-2)]" aria-hidden="true" /><span className={label}>Play streak</span><span className="ml-auto text-xs text-[var(--text-muted)]"><b className="text-[var(--text)]">{summary.streakDays}</b> {summary.streakDays === 1 ? "day" : "days"}</span></div>
                    <div className="flex items-center gap-1.5">
                      {summary.week.map((entry) => (
                        <span key={entry.day} title={entry.day} className={cn("grid size-[26px] place-items-center rounded-full border text-[10px] font-bold", entry.played ? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]" : "border-[var(--line)] text-[var(--text-dim)]")}>{dayLetter(entry.day)}</span>
                      ))}
                      <span className="ml-auto text-[11px] text-[var(--text-dim)]">+100 LX on day 7</span>
                    </div>
                  </section>
                </>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-3.5">
              {summary && <EarningsChart daily={summary.daily} />}
              <div className="grid items-start gap-3.5 xl:grid-cols-[1.25fr_1fr]">
                <section className={cn(card, "overflow-hidden")} aria-label="Activity">
                  <div className="flex items-center gap-2 border-b border-[var(--line-soft)] px-4 py-3"><span className={cn(label, "mr-auto")}>Activity</span><Chips value={filter} onChange={setFilter} /></div>
                  <Activity entries={entries.slice(0, 8)} empty="No LX activity yet. Finish a ranked match to earn your first LX." />
                </section>
                {earnRules}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
