/**
 * Remade 2026-11-07 (owner request: "more varied, less text, a preview, not a side column, fewer colours"): one centred column. A live
 * preview on top (a coin stack that grows with the package, the LX it adds, a balance bar with the clan price marked), then a row of
 * package tiles with a slider for an own amount, a strip of what the new balance buys, and the latest top-ups. Neutral palette only.
 *
 * The Shop's Top up tab: pick an LX package or an amount, see what the balance becomes and what it buys, and pay on Wire's page (owner
 * request 2026-11-02, through the Wire gateway since 2026-11-03: QPay and the bank apps are there). The server adds the LX once Wire says
 * the payment succeeded. Everything comes from the API.
 */
import { useEffect, useMemo, useState } from "react"
import { Check, Minus, Pencil, Plus, RotateCcw, ShieldPlus, Users } from "lucide-react"
import { toast } from "sonner"
import { useSearchParams } from "react-router-dom"

import { walletService, type Wallet } from "@/api"
import { shopGoodsService, type GoodsProduct } from "@/api/shop-goods"
import type { TopUp, TopUpAvailability, TopUpInvoice } from "@/api/wallet"
import qpayLogo from "@/assets/payments/qpay.svg"
import { AnimatedNumber } from "@/components/animated-number"
import { LxMark } from "@/components/lx-mark"
import { RelativeTime } from "@/components/relative-time"
import { TopUpPayDialog } from "@/components/topup-pay-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

const mnt = (value: number) => `${value.toLocaleString()}₮`

const STATE_LABEL: Record<TopUp["status"], string> = { pending: "Waiting for payment", paid: "Paid · FOL$ added", expired: "Expired", failed: "Failed" }

export function ShopTopUp() {
  const { user } = useAuth()
  const products = useApiQuery<GoodsProduct[]>((signal) => shopGoodsService.products({ signal }), { queryKey: "shop-goods" })
  const topUpsQuery = useApiQuery<TopUp[]>((signal) => walletService.myTopUps({ signal }), { enabled: Boolean(user), queryKey: user ? `topups:${user.id}` : "topups:guest" })
  const availability = useApiQuery<TopUpAvailability>((signal) => walletService.topUpAvailable({ signal }), { queryKey: "topup-available" })
  const wallet = useApiQuery<Wallet>((signal) => walletService.getMine({ signal }), { enabled: Boolean(user), queryKey: user ? `wallet:${user.id}` : "wallet:guest" })
  const [picked, setPicked] = useState<string | null>(null)
  const [invoice, setInvoice] = useState<TopUpInvoice | null>(null)
  const [starting, setStarting] = useState(false)
  const [customMnt, setCustomMnt] = useState(10000)

  const packages = useMemo(() => (products.data ?? []).filter((product) => product.kind === "lx" && product.grantsLx > 0).sort((a, b) => a.priceMnt - b.priceMnt), [products.data])
  const balance = wallet.data?.balance ?? null
  const clanPrice = wallet.data?.clanPrices?.create ?? null
  // What each package is worth against the smallest one, so a bigger package shows its bonus. Only real prices are compared.
  const baseRate = packages[0] ? packages[0].priceMnt / packages[0].grantsLx : null
  const bonusOf = (pack: GoodsProduct) => (baseRate ? Math.round((pack.grantsLx / (pack.priceMnt / baseRate) - 1) * 100) : 0)
  const bestValue = packages.length > 1 ? packages.reduce((best, pack) => (pack.priceMnt / pack.grantsLx < best.priceMnt / best.grantsLx ? pack : best)) : null

  // Start on the smallest package that lets the player open a clan, else the biggest one.
  useEffect(() => {
    if (picked || packages.length === 0) return
    const fit = clanPrice != null && balance != null ? packages.find((pack) => balance + pack.grantsLx >= clanPrice) : null
    setPicked((fit ?? packages[Math.min(1, packages.length - 1)]).id)
  }, [packages, picked, balance, clanPrice])

  const selected = packages.find((pack) => pack.id === picked) ?? null
  const topUps = topUpsQuery.data ?? []
  const qpayReady = availability.data?.available !== false
  const range = availability.data?.custom ?? null
  // Any amount is paid at the smallest package's rate (the API works it out the same way), so a bigger package is the better deal.
  const base = packages[0] ?? null
  const customLx = base ? Math.floor((customMnt * base.grantsLx) / base.priceMnt) : 0
  const offer = picked === "custom" && range && base ? { grantsLx: customLx, priceMnt: customMnt } : selected
  const [typedAmount, setTypedAmount] = useState<string | null>(null)
  const setAmount = (value: number) => { if (range) setCustomMnt(Math.min(range.maxMnt, Math.max(range.minMnt, Math.round(value / range.stepMnt) * range.stepMnt))) }

  const start = async () => {
    if (!offer || starting) return
    if (!user) { toast.error("Sign in with Steam to top up."); return }
    setStarting(true)
    try {
      setInvoice(await walletService.startTopUp(picked === "custom" ? { amountMnt: customMnt } : { productId: selected!.id }))
    } catch (caught) {
      // The API client throws a plain { status, code, message } object, not an Error, so read the message from either.
      const message = (caught as { message?: unknown } | null)?.message
      toast.error(typeof message === "string" && message ? message : "Could not start the payment. Try again.")
    } finally {
      setStarting(false)
    }
  }
  // Wire sends the player back here with ?topup=<id> after paying: look at that top-up once, say how it went, and tidy the address.
  const [params, setParams] = useSearchParams()
  const returned = params.get("topup")
  useEffect(() => {
    if (!returned || !user) return
    let cancelled = false
    void walletService.topUp(returned).then((result) => {
      if (cancelled) return
      if (result.status === "paid") toast.success(`Paid. ${result.grantsLx.toLocaleString()} FOL$ are in your wallet.`)
      else if (result.status === "pending") toast("Waiting for the payment to arrive. The FOL$ are added as soon as it does.")
      void wallet.refetch()
      void topUpsQuery.refetch()
    }).catch(() => undefined).finally(() => { if (!cancelled) setParams((current) => { const next = new URLSearchParams(current); next.delete("topup"); return next }, { replace: true }) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returned, user?.id])
  const settled = (status: TopUp["status"]) => {
    void wallet.refetch()
    void topUpsQuery.refetch()
    if (status === "paid") toast.success("Paid. The FOL$ are in your wallet.")
  }

  if (products.loading) return <div className="mx-auto flex w-full max-w-[920px] flex-col gap-6"><Skeleton className="h-[190px] rounded-2xl" /><div className="grid grid-cols-2 gap-3 @[500px]:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[112px] rounded-2xl" />)}</div><Skeleton className="h-[130px] rounded-2xl" /></div>
  if (products.error || !products.data) {
    return <p className="flex items-center justify-center gap-3 py-24 text-[13px] text-[var(--text-dim)]">Could not load the packages.<button type="button" onClick={products.refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
  }
  if (packages.length === 0) return <p className="py-8 text-[13px] text-[var(--text-dim)]">No top-up packages right now.</p>

  const after = balance != null && offer ? balance + offer.grantsLx : null
  const goal = clanPrice != null && after != null ? Math.max(clanPrice, after, balance ?? 0) : after ?? 0
  const percent = (value: number) => (goal > 0 ? Math.min(100, (value / goal) * 100) : 0)
  const buys = wallet.data?.clanPrices
    ? [{ name: "Create a clan", price: wallet.data.clanPrices.create, icon: ShieldPlus }, { name: "Rename", price: wallet.data.clanPrices.rename, icon: Pencil }, { name: "Slots", price: wallet.data.clanPrices.slots, icon: Users }]
    : []

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-6 pb-24 lg:pb-6">
      <section aria-label="Preview" className="lx-glass lx-noir-hero relative overflow-hidden rounded-2xl border border-[var(--glass-line)] bg-[var(--card-surface)]">
        <div className="relative grid items-center gap-6 p-5 sm:p-6">
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <span className="flex items-baseline gap-2"><span className="text-[34px] font-bold leading-none text-[var(--text)]">+<AnimatedNumber value={offer?.grantsLx ?? 0} durationMs={450} /></span><span className="text-[15px] font-semibold text-[var(--text-muted)]">FOL$</span></span>
              {offer && <span className="flex items-center gap-2 text-[22px] font-bold text-[var(--text)]">{mnt(offer.priceMnt)}<img src={qpayLogo} alt="QPay" className="h-4 w-10 opacity-80" draggable={false} /></span>}
            </div>
            {balance != null && after != null && (
              <div className="flex flex-col gap-2">
                <div className="relative h-3 overflow-hidden rounded-full bg-[var(--line)]" role="img" aria-label={`Balance ${balance.toLocaleString()} FOL$, ${after.toLocaleString()} FOL$ after the top-up`}>
                  <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--status-green)]/70 transition-[width] duration-500" style={{ width: `${percent(after)}%` }} />
                  <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent-solid)] transition-[width] duration-500" style={{ width: `${percent(balance)}%` }} />
                  {clanPrice != null && <span className="absolute inset-y-0 w-0.5 bg-[var(--bg)]" style={{ left: `calc(${percent(clanPrice)}% - 1px)` }} />}
                </div>
                <div className="flex items-center justify-between text-[12px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5"><LxMark size={14} />{balance.toLocaleString()}</span>
                  <span className="flex items-center gap-1.5 font-semibold text-[var(--status-green)]">→ <LxMark size={14} /><AnimatedNumber value={after} durationMs={450} /></span>
                </div>
              </div>
            )}
            <button type="button" disabled={!offer || starting || (Boolean(user) && !qpayReady)} onClick={() => void start()} className="lx-primary-button hidden h-12 items-center justify-center rounded-lg px-5 text-[15px] font-semibold disabled:opacity-50 sm:inline-flex">
              {!user ? "Sign in to top up" : starting ? "Starting…" : offer ? `Pay ${mnt(offer.priceMnt)}` : "Pick an amount"}
            </button>
            {user && !qpayReady && <p className="text-xs text-[var(--text-dim)]">Top-up is not set up yet.</p>}
          </div>
        </div>
      </section>

      <section aria-label="Packages" className="@container flex flex-col gap-3">
        <div role="radiogroup" aria-label="FOL$ packages" className="grid grid-cols-2 gap-3 @[500px]:grid-cols-5">
          {packages.map((pack) => {
            const on = pack.id === picked
            const bonus = bonusOf(pack)
            return (
              <button key={pack.id} type="button" role="radio" aria-checked={on} onClick={() => setPicked(pack.id)} className={cn("lx-frost group relative flex flex-col items-center gap-2 overflow-hidden rounded-xl border bg-[var(--card-surface)] min-h-[104px] px-2 pb-3 pt-2.5 text-center transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0", on ? "border-[var(--text)] bg-[var(--raised)]" : "border-[var(--line-soft)] hover:border-[var(--line-strong)]")}>
                <span className="flex h-5 w-full items-center justify-between" aria-hidden={!bonus && bestValue?.id !== pack.id && !on}>
                  {bonus > 0 ? <span className="rounded-full border border-[var(--status-green)]/40 bg-[var(--status-green)]/10 text-[var(--status-green)] px-1.5 py-px text-[10px] font-semibold">+{bonus}%</span>
                    : bestValue?.id === pack.id ? <span className="rounded-full border border-[var(--status-green)]/40 bg-[var(--status-green)]/10 text-[var(--status-green)] px-1.5 py-px text-[10px] font-semibold">Best</span> : <span />}
                  {on ? <span className="grid size-5 place-items-center rounded-full bg-[var(--text)] text-[var(--bg)]"><Check className="size-3.5" aria-hidden="true" /></span> : <span />}
                </span>
                {pack.imageUrl ? <img src={pack.imageUrl} alt="" loading="lazy" className="size-14 rounded-lg object-cover" /> : null}
                <span className="mt-2 flex items-baseline gap-1.5"><span className="text-[22px] font-bold leading-none text-[var(--text)]">{pack.grantsLx.toLocaleString()}</span><span className="text-[11px] font-semibold text-[var(--text-muted)]">FOL$</span></span>
                <span className="text-[13px] text-[var(--text-2)]">{mnt(pack.priceMnt)}</span>
                <span className="mt-auto h-1 w-full overflow-hidden rounded-full bg-[var(--line)]" aria-hidden="true"><span className="block h-full rounded-full bg-[var(--text-faint)] transition-colors group-hover:bg-[var(--text-2)]" style={{ width: `${Math.max(6, (pack.grantsLx / Math.max(...packages.map((item) => item.grantsLx), 1)) * 100)}%`, ...(on ? { background: "var(--text)" } : null) }} /></span>
              </button>
            )
          })}
        </div>
        {range && base && (
          <div onClick={() => setPicked("custom")} className={cn("lx-frost flex flex-col gap-4 rounded-xl border bg-[var(--card-surface)] p-5 transition-colors", picked === "custom" ? "border-[var(--text)]" : "border-[var(--line)] hover:border-[var(--line-strong)]")}>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <label className="flex flex-col gap-2 text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]" htmlFor="topup-own-amount">
                Your own amount
                <span className="flex h-10 items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] pl-4 pr-2 normal-case tracking-normal focus-within:border-[var(--text)]">
                  <input
                    id="topup-own-amount"
                    inputMode="numeric"
                    value={typedAmount ?? customMnt.toLocaleString()}
                    onFocus={(event) => { const input = event.currentTarget; setPicked("custom"); setTypedAmount(String(customMnt)); requestAnimationFrame(() => input.select()) }}
                    onChange={(event) => { setPicked("custom"); setTypedAmount(event.target.value.replace(/[^0-9]/g, "")) }}
                    onBlur={() => { if (typedAmount != null) setAmount(Number(typedAmount || 0)); setTypedAmount(null) }}
                    onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur() }}
                    className="w-32 bg-transparent text-[18px] font-bold text-[var(--text)] outline-none"
                  />
                  <span className="text-[18px] font-semibold text-[var(--text-2)]">₮</span>
                  <span className="ml-1 flex items-center">
                    <button type="button" aria-label="Less" onClick={(event) => { event.stopPropagation(); setPicked("custom"); setAmount(customMnt - range.stepMnt * 5) }} className="grid size-8 place-items-center rounded-md text-[var(--text-2)] hover:bg-[var(--raised)]"><Minus className="size-4" aria-hidden="true" /></button>
                    <button type="button" aria-label="More" onClick={(event) => { event.stopPropagation(); setPicked("custom"); setAmount(customMnt + range.stepMnt * 5) }} className="grid size-8 place-items-center rounded-md text-[var(--text-2)] hover:bg-[var(--raised)]"><Plus className="size-4" aria-hidden="true" /></button>
                  </span>
                </span>
              </label>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">You get</span>
                <span className="flex items-baseline gap-1.5"><b className="text-[22px] leading-none text-[var(--text)]">{customLx.toLocaleString()}</b><span className="text-[12px] font-semibold text-[var(--text-muted)]">FOL$</span></span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <input type="range" aria-label="Amount in tugrik" min={range.minMnt} max={range.maxMnt} step={range.stepMnt} value={customMnt} onChange={(event) => { setPicked("custom"); setAmount(Number(event.target.value)) }} className="lx-range w-full" style={{ ["--fill" as string]: `${((customMnt - range.minMnt) / Math.max(1, range.maxMnt - range.minMnt)) * 100}%` }} />
              <div className="flex justify-between text-[11px] text-[var(--text-dim)]"><span>{mnt(range.minMnt)}</span><span>{mnt(range.maxMnt)}</span></div>
            </div>
          </div>
        )}
      </section>

      {buys.length > 0 && after != null && (
        <section aria-label="What it buys" className="grid grid-cols-3 gap-3">
          {buys.map((item) => {
            const enough = after >= item.price
            const Icon = item.icon
            return (
              <div key={item.name} className="lx-frost flex flex-col items-center gap-2 rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] px-2 py-3 text-center">
                <span className="relative grid size-11 place-items-center">
                  <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true"><circle cx="22" cy="22" r="19" fill="none" stroke="var(--line)" strokeWidth="3" /><circle cx="22" cy="22" r="19" fill="none" stroke={enough ? "var(--status-green)" : "var(--accent-solid)"} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${Math.min(1, after / item.price) * 119.4} 119.4`} className="transition-[stroke-dasharray] duration-500" /></svg>
                  {enough ? <Check className="size-4 text-[var(--status-green)]" aria-hidden="true" /> : <Icon className="size-4 text-[var(--text-2)]" aria-hidden="true" />}
                </span>
                <span className="text-[12px] font-semibold text-[var(--text)]">{item.name}</span>
                <span className="flex items-center gap-1 text-[11px] text-[var(--text-dim)]"><LxMark size={12} />{item.price.toLocaleString()}</span>
              </div>
            )
          })}
        </section>
      )}

      {user && topUps.length > 0 && (
        <section aria-label="My top-ups" className="flex flex-col gap-2">
          {topUps.slice(0, 5).map((topUp) => (
            <div key={topUp.id} className="lx-frost flex items-center gap-3 rounded-xl border border-[var(--glass-line)] px-4 py-3">
              <LxMark size={18} />
              <span className="flex min-w-0 flex-1 items-baseline gap-2"><b className="text-[13px] text-[var(--text)]">{topUp.grantsLx.toLocaleString()}</b><span className="text-[12px] text-[var(--text-dim)]">{mnt(topUp.amountMnt)}</span></span>
              <RelativeTime value={topUp.createdAt} className="hidden text-[11px] text-[var(--text-dim)] sm:inline" />
              <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", topUp.status === "paid" ? "border-[var(--status-green)]/40 bg-[var(--status-green)]/10 text-[var(--status-green)]" : topUp.status === "failed" ? "border-[var(--status-red)]/40 bg-[var(--status-red)]/10 text-[var(--status-red)]" : "border-[var(--line)] text-[var(--text-dim)]")}>{STATE_LABEL[topUp.status]}</span>
            </div>
          ))}
        </section>
      )}

      {/* On a phone the pay button stays at the bottom of the screen. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[var(--panel)] p-3 sm:hidden" style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <button type="button" disabled={!offer || starting || (Boolean(user) && !qpayReady)} onClick={() => void start()} className="lx-primary-button inline-flex h-12 w-full items-center justify-center rounded-lg px-5 text-[15px] font-semibold disabled:opacity-50">
          {!user ? "Sign in to top up" : starting ? "Starting…" : offer ? `Pay ${mnt(offer.priceMnt)}` : "Pick an amount"}
        </button>
      </div>

      <TopUpPayDialog invoice={invoice} onClose={() => setInvoice(null)} onSettled={settled} />
    </div>
  )
}
