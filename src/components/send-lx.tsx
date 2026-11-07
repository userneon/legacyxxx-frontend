import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Check, Loader2, Search } from "lucide-react"
import { toast } from "sonner"

import { searchService, walletService, type TransferRules } from "@/api"
import { LxMark } from "@/components/lx-mark"
import { PlayerAvatar } from "@/components/player-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

type Found = { id: string; name: string; avatar?: string | null }

/** The fee, the way the API works it out (rounded up), so the preview shows what the receiver will really get. */
const feeOf = (amount: number, percent: number) => Math.ceil((amount * percent) / 100)

/**
 * Wallet → Send (owner request 2026-11-07, "make LX transferable, with a fee"): pick a player by name, type an amount, see what they will get after the
 * fee, confirm. The rules (fee, smallest and largest, daily and hourly limits) are the API's; nothing is worked out here that the API does not check again.
 */
export function SendLx({ balance, onSent }: { balance: number; onSent: () => void }) {
  const { user } = useAuth()
  const { data: rules, loading, error, refetch } = useApiQuery<TransferRules>((signal) => walletService.transferRules({ signal }), { queryKey: user ? `transfer-rules:${user.id}` : "transfer-rules" })
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Found[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState<Found | null>(null)
  const [amountText, setAmountText] = useState("")
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  // Search the players by name as the text changes (a short pause first, and only for two letters or more).
  useEffect(() => {
    const text = query.trim()
    if (picked || text.length < 2) { setResults(null); return }
    setSearching(true)
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchService.search({ kind: "players", query: text }, { signal: controller.signal })
        .then((answer) => setResults((("players" in answer ? answer.players : []) ?? []).filter((player) => player.id && player.id !== user?.id).slice(0, 8).map((player) => ({ id: player.id!, name: player.name, avatar: (player as { avatar?: string | null }).avatar ?? null }))))
        .catch(() => { if (!controller.signal.aborted) setResults([]) })
        .finally(() => { if (!controller.signal.aborted) setSearching(false) })
    }, 300)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [query, picked, user?.id])

  const amount = useMemo(() => { const value = Number(amountText.replace(/[^0-9]/g, "")); return Number.isFinite(value) ? value : 0 }, [amountText])
  const fee = rules ? feeOf(amount, rules.feePercent) : 0
  const problem = useMemo(() => {
    if (!rules) return null
    if (rules.blocked) return rules.blocked
    if (amount <= 0) return null
    if (amount < rules.min) return `The smallest transfer is ${rules.min} LX.`
    if (amount > rules.max) return `One transfer can be at most ${rules.max.toLocaleString()} LX.`
    if (amount > balance) return "You do not have that much LX."
    if (rules.sentLastHour >= rules.perHour) return `You can make ${rules.perHour} transfers an hour. Try again later.`
    if (amount > rules.remainingToday) return `${rules.remainingToday.toLocaleString()} LX left to send today.`
    return null
  }, [rules, amount, balance])
  const ready = Boolean(picked) && amount > 0 && !problem

  const send = async () => {
    if (!picked || !ready) return
    setBusy(true)
    try {
      const result = await walletService.transfer({ userId: picked.id, amount })
      toast.success(`Sent ${result.sent.toLocaleString()} LX to ${result.to}`, { description: `They received ${result.received.toLocaleString()} LX (fee ${result.fee.toLocaleString()}).` })
      setPicked(null); setQuery(""); setAmountText(""); setConfirming(false)
      onSent()
      refetch()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "The transfer did not go through")
      setConfirming(false)
    } finally {
      setBusy(false)
    }
  }

  if (loading && !rules) return <Skeleton className="h-[360px] max-w-xl rounded-xl" />
  if (error || !rules) {
    return <p className="flex max-w-xl items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load the transfer rules.<button type="button" onClick={refetch} className="text-[var(--text-2)] underline-offset-2 hover:text-[var(--text)] hover:underline">Retry</button></p>
  }

  return (
    <section aria-label="Send LX" className="flex max-w-xl flex-col gap-4 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-5">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">Send LX</span>
        <p className="text-[13px] text-[var(--text-muted)]">Send LX to another player. {rules.feePercent}% of it is kept as a fee, so they receive a little less.</p>
      </div>

      {rules.blocked && <p role="status" className="rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 py-2 text-[13px] text-[var(--text-muted)]">{rules.blocked}</p>}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="send-lx-player" className="text-xs text-[var(--text-muted)]">To</label>
        {picked ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 py-2">
            <PlayerAvatar avatar={picked.avatar ?? undefined} name={picked.name} className="size-7 shrink-0 rounded-full text-[10px]" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--text)]">{picked.name}</span>
            <button type="button" onClick={() => { setPicked(null); setConfirming(false) }} className="text-xs text-[var(--text-dim)] hover:text-[var(--text)]">Change</button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 focus-within:border-[var(--text-faint)]">
              <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
              <input id="send-lx-player" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a player by name" autoComplete="off" className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none" />
              {searching && <Loader2 className="size-4 animate-spin text-[var(--text-dim)]" aria-hidden="true" />}
            </label>
            {results && (
              results.length === 0
                ? <p className="px-1 text-xs text-[var(--text-dim)]">No player with that name.</p>
                : <ul className="flex flex-col overflow-hidden rounded-lg border border-[var(--line)]">
                    {results.map((player) => (
                      <li key={player.id}>
                        <button type="button" onClick={() => { setPicked(player); setResults(null) }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-[var(--text-2)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]">
                          <PlayerAvatar avatar={player.avatar ?? undefined} name={player.name} className="size-6 shrink-0 rounded-full text-[9px]" />
                          <span className="truncate">{player.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="send-lx-amount" className="text-xs text-[var(--text-muted)]">How much</label>
        <div className="flex h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 focus-within:border-[var(--text-faint)]">
          <LxMark size={16} />
          <input id="send-lx-amount" inputMode="numeric" value={amountText} onChange={(event) => { setAmountText(event.target.value.replace(/[^0-9]/g, "")); setConfirming(false) }} placeholder={`${rules.min} to ${rules.max.toLocaleString()}`} className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none" />
          <span className="text-xs text-[var(--text-dim)]">of {balance.toLocaleString()}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[100, 500, 1000, 5000].filter((preset) => preset <= rules.max).map((preset) => (
            <button key={preset} type="button" onClick={() => { setAmountText(String(preset)); setConfirming(false) }} className="h-7 rounded-lg border border-[var(--line)] px-2.5 text-xs text-[var(--text-2)] transition-colors hover:bg-[var(--raised)]">{preset.toLocaleString()}</button>
          ))}
        </div>
      </div>

      {amount > 0 && (
        <div className="flex flex-col gap-1 rounded-lg border border-[var(--line-soft)] bg-[var(--card-surface)] px-3.5 py-3 text-[13px]">
          <div className="flex justify-between text-[var(--text-muted)]"><span>You send</span><span className="inline-flex items-center gap-1"><LxMark size={12} />{amount.toLocaleString()}</span></div>
          <div className="flex justify-between text-[var(--text-muted)]"><span>Fee ({rules.feePercent}%)</span><span>−{fee.toLocaleString()}</span></div>
          <div className="flex justify-between font-semibold text-[var(--text)]"><span>{picked ? `${picked.name} gets` : "They get"}</span><span className="inline-flex items-center gap-1"><LxMark size={13} />{Math.max(0, amount - fee).toLocaleString()}</span></div>
        </div>
      )}

      {problem && <p role="alert" className="text-xs text-[var(--status-red)]">{problem}</p>}

      <div className="flex items-center gap-3">
        {confirming ? (
          <>
            <button type="button" disabled={busy || !ready} onClick={() => void send()} className="lx-primary-button inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-[13px] font-semibold disabled:opacity-60">
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}Confirm: send {amount.toLocaleString()} LX to {picked?.name}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="h-10 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-4 text-[13px] text-[var(--text-2)]">Cancel</button>
          </>
        ) : (
          <button type="button" disabled={!ready} onClick={() => setConfirming(true)} className={cn("lx-primary-button inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-[13px] font-semibold disabled:opacity-50")}>
            Send<ArrowRight className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-[var(--text-dim)]">
        {rules.min}–{rules.max.toLocaleString()} LX a transfer, up to {rules.dailyMax.toLocaleString()} LX a day ({rules.remainingToday.toLocaleString()} left today), {rules.perHour} transfers an hour. A new account can receive LX but needs a ranked match before it can send. A sent transfer cannot be taken back.
      </p>
    </section>
  )
}
