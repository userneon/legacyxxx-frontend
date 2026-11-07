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
import { Check, Pencil, RotateCcw, ShieldPlus, SlidersHorizontal, Users } from "lucide-react"
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

const STATE_LABEL: Record<TopUp["status"], string> = { pending: "Waiting for payment", paid: "Paid · LX added", expired: "Expired", failed: "Failed" }

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
      if (result.status === "paid") toast.success(`Paid. ${result.grantsLx.toLocaleString()} LX are in your wallet.`)
      else if (result.status === "pending") toast("Waiting for the payment to arrive. The LX are added as soon as it does.")
      void wallet.refetch()
      void topUpsQuery.refetch()
    }).catch(() => undefined).finally(() => { if (!cancelled) setParams((current) => { const next = new URLSearchParams(current); next.delete("topup"); return next }, { replace: true }) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returned, user?.id])
  const settled = (status: TopUp["status"]) => {
    void wallet.refetch()
    void topUpsQuery.refetch()
    if (status === "paid") toast.success("Paid. The LX are in your wallet.")
  }

  if (products.loading) return <div className="mx-auto flex w-full max-w-[920px] flex-col gap-6"><Skeleton className="h-[240px] rounded-2xl" /><Skeleton className="h-[140px] rounded-xl" /></div>
  if (products.error || !products.data) {
    return <p className="flex items-center justify-center gap-3 py-24 text-[13px] text-[var(--text-dim)]">Could not load the packages.<button type="button" onClick={products.refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
  }
  if (packages.length === 0) return <p className="py-8 text-[13px] text-[var(--text-dim)]">No top-up packages right now.</p>

  const after = balance != null && offer ? balance + offer.grantsLx : null
  // The preview's coin stack: 1 to 5 coins by how big the choice is among the real packages (a picture only, no numbers).
  const position = picked === "custom" && range ? (customMnt - range.minMnt) / Math.max(1, range.maxMnt - range.minMnt) : packages.length > 1 ? Math.max(0, packages.findIndex((pack) => pack.id === picked)) / (packages.length - 1) : 0.5
  const coins = 1 + Math.round(position * 4)
  const goal = clanPrice != null && after != null ? Math.max(clanPrice, after, balance ?? 0) : after ?? 0
  const percent = (value: number) => (goal > 0 ? Math.min(100, (value / goal) * 100) : 0)
  const buys = wallet.data?.clanPrices
    ? [{ name: "Create a clan", price: wallet.data.clanPrices.create, icon: ShieldPlus }, { name: "Rename", price: wallet.data.clanPrices.rename, icon: Pencil }, { name: "Slots", price: wallet.data.clanPrices.slots, icon: Users }]
    : []

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-6 pb-24 lg:pb-6">
      <section aria-label="Preview" className="relative overflow-hidden rounded-2xl border border-[var(--glass-line)] bg-[var(--card-surface)]">
        <span aria-hidden="true" className="pointer-events-none absolute -left-10 top-1/2 aspect-square w-[320px] -translate-y-1/2 opacity-25" style={{ background: "radial-gradient(circle, #e5e5e5 0%, transparent 62%)" }} />
        <div className="relative grid items-center gap-6 p-5 sm:grid-cols-[200px_minmax(0,1fr)] sm:p-7">
          <div className="grid h-[170px] place-items-center" aria-hidden="true">
            <div key={coins} className="relative h-[150px] w-[110px] animate-[lx-coin-drop_.45s_ease-out_backwards] motion-reduce:animate-none">
              {Array.from({ length: coins }, (_, index) => (
                <span key={index} className="absolute left-1/2 -translate-x-1/2 drop-shadow-[0_6px_10px_rgba(0,0,0,.55)]" style={{ bottom: index * 22, zIndex: index }}><LxMark size={index === coins - 1 ? 84 : 76} /></span>
              ))}
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <span className="flex items-baseline gap-2"><span className="text-[44px] font-bold leading-none text-[var(--text)]">+<AnimatedNumber value={offer?.grantsLx ?? 0} durationMs={450} /></span><span className="text-[15px] font-semibold text-[var(--text-muted)]">LX</span></span>
              {offer && <span className="flex items-center gap-2 text-[22px] font-bold text-[var(--text)]">{mnt(offer.priceMnt)}<img src={qpayLogo} alt="QPay" className="h-4 w-10 opacity-80" draggable={false} /></span>}
            </div>
            {balance != null && after != null && (
              <div className="flex flex-col gap-2">
                <div className="relative h-3 overflow-hidden rounded-full bg-[var(--line)]" role="img" aria-label={`Balance ${balance.toLocaleString()} LX, ${after.toLocaleString()} LX after the top-up`}>
                  <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--text-faint)] transition-[width] duration-500" style={{ width: `${percent(after)}%` }} />
                  <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent-solid)] transition-[width] duration-500" style={{ width: `${percent(balance)}%` }} />
                  {clanPrice != null && <span className="absolute inset-y-0 w-0.5 bg-[var(--bg)]" style={{ left: `calc(${percent(clanPrice)}% - 1px)` }} />}
                </div>
                <div className="flex items-center justify-between text-[12px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5"><LxMark size={14} />{balance.toLocaleString()}</span>
                  <span className="flex items-center gap-1.5 font-semibold text-[var(--text)]">→ <LxMark size={14} /><AnimatedNumber value={after} durationMs={450} /></span>
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

      <section aria-label="Packages" className="flex flex-col gap-3">
        <div role="radiogroup" aria-label="LX packages" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {packages.map((pack, index) => {
            const on = pack.id === picked
            const bonus = bonusOf(pack)
            const stack = 1 + Math.round((packages.length > 1 ? index / (packages.length - 1) : 0.5) * 4)
            return (
              <button key={pack.id} type="button" role="radio" aria-checked={on} onClick={() => setPicked(pack.id)} className={cn("group relative flex flex-col items-center gap-2 overflow-hidden rounded-xl border bg-[var(--card-surface)] px-3 pb-3 pt-4 text-center transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0", on ? "border-[var(--text)] bg-[var(--raised)]" : "border-[var(--line-soft)] hover:border-[var(--line-strong)]")}>
                {pack.imageUrl ? <img src={pack.imageUrl} alt="" loading="lazy" className="size-14 rounded-lg object-cover" /> : (
                  <span className="relative h-14 w-12" aria-hidden="true">{Array.from({ length: stack }, (_, i) => <span key={i} className="absolute left-1/2 -translate-x-1/2" style={{ bottom: i * 7, zIndex: i }}><LxMark size={32} /></span>)}</span>
                )}
                <span className="flex items-baseline gap-1"><span className="text-[20px] font-bold leading-none text-[var(--text)]">{pack.grantsLx.toLocaleString()}</span><span className="text-[11px] font-semibold text-[var(--text-muted)]">LX</span></span>
                <span className="text-[13px] text-[var(--text-2)]">{mnt(pack.priceMnt)}</span>
                {bonus > 0 && <span className="absolute left-2 top-2 rounded-full border border-[var(--line-strong)] bg-[var(--bg)] px-1.5 py-px text-[10px] font-semibold text-[var(--text)]">+{bonus}%</span>}
                {bestValue?.id === pack.id && !bonus && <span className="absolute left-2 top-2 rounded-full border border-[var(--line-strong)] bg-[var(--bg)] px-1.5 py-px text-[10px] text-[var(--text-2)]">Best</span>}
                {on && <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-[var(--text)] text-[var(--bg)]"><Check className="size-3.5" aria-hidden="true" /></span>}
              </button>
            )
          })}
        </div>
        {range && base && (
          <div onClick={() => setPicked("custom")} className={cn("flex flex-col gap-3 rounded-xl border bg-[var(--card-surface)] p-4 transition-colors", picked === "custom" ? "border-[var(--text)]" : "border-dashed border-[var(--line)] hover:border-[var(--line-strong)]")}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text)]"><SlidersHorizontal className="size-4 text-[var(--text-2)]" aria-hidden="true" />Your own amount</span>
              <span className="flex items-baseline gap-1.5"><b className="text-[18px] leading-none text-[var(--text)]">{mnt(customMnt)}</b><span className="text-[12px] text-[var(--text-dim)]">≈ {customLx.toLocaleString()} LX</span></span>
            </div>
            <input type="range" aria-label="Amount in tugrik" min={range.minMnt} max={range.maxMnt} step={range.stepMnt} value={customMnt} onChange={(event) => { setPicked("custom"); setAmount(Number(event.target.value)) }} className="h-2 w-full cursor-pointer accent-[var(--text)]" />
            <div className="flex justify-between text-[11px] text-[var(--text-dim)]"><span>{mnt(range.minMnt)}</span><span>{mnt(range.maxMnt)}</span></div>
          </div>
        )}
      </section>

      {buys.length > 0 && after != null && (
        <section aria-label="What it buys" className="grid grid-cols-3 gap-3">
          {buys.map((item) => {
            const enough = after >= item.price
            const Icon = item.icon
            return (
              <div key={item.name} className="flex flex-col items-center gap-2 rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] px-2 py-3 text-center">
                <span className="relative grid size-11 place-items-center">
                  <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true"><circle cx="22" cy="22" r="19" fill="none" stroke="var(--line)" strokeWidth="3" /><circle cx="22" cy="22" r="19" fill="none" stroke="var(--accent-solid)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${Math.min(1, after / item.price) * 119.4} 119.4`} className="transition-[stroke-dasharray] duration-500" /></svg>
                  {enough ? <Check className="size-4 text-[var(--text)]" aria-hidden="true" /> : <Icon className="size-4 text-[var(--text-2)]" aria-hidden="true" />}
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
            <div key={topUp.id} className="flex items-center gap-3 rounded-xl border border-[var(--glass-line)] px-4 py-2.5">
              <LxMark size={18} />
              <span className="flex min-w-0 flex-1 items-baseline gap-2"><b className="text-[13px] text-[var(--text)]">{topUp.grantsLx.toLocaleString()}</b><span className="text-[12px] text-[var(--text-dim)]">{mnt(topUp.amountMnt)}</span></span>
              <RelativeTime value={topUp.createdAt} className="hidden text-[11px] text-[var(--text-dim)] sm:inline" />
              <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", topUp.status === "paid" ? "border-[var(--text-2)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-dim)]")}>{STATE_LABEL[topUp.status]}</span>
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
