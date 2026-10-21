/**
 * The Shop's Top up tab: pick an LX package, see what the balance becomes and what it buys, send the request. Staff call, take the
 * payment (bank transfer or QPay) and mark it paid; the LX then arrive in the wallet on their own. Everything comes from the API.
 */
import { useEffect, useMemo, useState } from "react"
import { Check, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { walletService, type Wallet } from "@/api"
import { shopGoodsService, type GoodsOrder, type GoodsProduct } from "@/api/shop-goods"
import { AnimatedNumber } from "@/components/animated-number"
import { LxMark } from "@/components/lx-mark"
import { RelativeTime } from "@/components/relative-time"
import { OrderDialog } from "@/components/shop-goods"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

const mnt = (value: number) => `${value.toLocaleString()}₮`
const label = "text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]"

const STEPS = [
  { title: "Pick a package" },
  { title: "We call you" },
  { title: "You pay by bank or QPay" },
  { title: "LX reach your wallet" },
]

/** Where a top-up order stands: 0 sent, 1 called, 2 paid (the LX are in the wallet). -1 cancelled. */
function stage(status: GoodsOrder["status"]) {
  if (status === "cancelled") return -1
  if (status === "new") return 0
  if (status === "contacted") return 1
  return 2
}

export function ShopTopUp() {
  const { user } = useAuth()
  const products = useApiQuery<GoodsProduct[]>((signal) => shopGoodsService.products({ signal }), { queryKey: "shop-goods" })
  const orders = useApiQuery<GoodsOrder[]>((signal) => shopGoodsService.myOrders({ signal }), { enabled: Boolean(user), queryKey: user ? `shop-orders:${user.id}` : "shop-orders:guest" })
  const wallet = useApiQuery<Wallet>((signal) => walletService.getMine({ signal }), { enabled: Boolean(user), queryKey: user ? `wallet:${user.id}` : "wallet:guest" })
  const [picked, setPicked] = useState<string | null>(null)
  const [ordering, setOrdering] = useState<GoodsProduct | null>(null)

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
  const topUps = (orders.data ?? []).filter((order) => order.productKind === "lx")

  if (products.loading) return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"><Skeleton className="h-[360px] rounded-xl" /><Skeleton className="h-[360px] rounded-xl" /></div>
  if (products.error || !products.data) {
    return <p className="flex items-center justify-center gap-3 py-24 text-[13px] text-[var(--text-dim)]">Could not load the packages.<button type="button" onClick={products.refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
  }
  if (packages.length === 0) return <p className="py-8 text-[13px] text-[var(--text-dim)]">No top-up packages right now.</p>

  const summary = (
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-4">
        <div className="flex flex-col gap-1">
          <span className={label}>Your LX</span>
          <span className="flex items-center gap-2 text-[26px] font-bold leading-none text-[var(--text)]"><LxMark size={24} />{balance != null ? <AnimatedNumber value={balance} durationMs={500} /> : "—"}</span>
        </div>
        {selected && (
          <>
            <div className="flex flex-col gap-2 rounded-[10px] border border-[var(--line-soft)] bg-[var(--panel)] p-3.5">
              <span className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)]">Package</span><b className="text-[var(--text)]">+{selected.grantsLx.toLocaleString()} LX</b></span>
              <span className="flex justify-between text-[13px]"><span className="text-[var(--text-muted)]">You pay</span><b className="text-[var(--text)]">{mnt(selected.priceMnt)}</b></span>
              {balance != null && <span className="flex justify-between border-t border-[var(--line-soft)] pt-2 text-[13px]"><span className="text-[var(--text-muted)]">New balance</span><b className="text-[var(--text)]">{(balance + selected.grantsLx).toLocaleString()} LX</b></span>}
            </div>
            {clanPrice != null && balance != null && (
              <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                {balance + selected.grantsLx >= clanPrice ? "Enough for a clan." : `${(clanPrice - balance - selected.grantsLx).toLocaleString()} LX short of a clan.`}
              </p>
            )}
            <button type="button" onClick={() => (user ? setOrdering(selected) : toast.error("Sign in with Steam to top up."))} className="lx-primary-button inline-flex h-11 items-center justify-center rounded-lg px-4 text-[14px] font-semibold">
              {user ? `Top up ${mnt(selected.priceMnt)}` : "Sign in to top up"}
            </button>
          </>
        )}
      </div>
  )

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-6">
        <section aria-label="Packages" className="flex flex-col gap-3">
          <span className={label}>Choose a package</span>
          <div role="radiogroup" aria-label="LX packages" className="grid grid-flow-dense grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-4">
            {packages.map((pack) => {
              const on = pack.id === picked
              const bonus = bonusOf(pack)
              const hero = packages.length > 2 && bestValue?.id === pack.id
              return (
                <button key={pack.id} type="button" role="radio" aria-checked={on} onClick={() => setPicked(pack.id)} className={cn("group relative flex h-[280px] flex-col justify-end overflow-hidden rounded-2xl border bg-[var(--card-surface)] text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50 max-sm:h-[230px]", hero && "col-span-2", on ? "border-[var(--text)]" : "border-[var(--line-soft)] hover:border-[var(--line-strong)]")}>
                  {/* The package's own picture fills the card; without one, a soft light and the LX coin stand in. */}
                  {pack.imageUrl ? (
                    <img src={pack.imageUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
                  ) : (
                    <>
                      <span aria-hidden="true" className="absolute left-1/2 top-[38%] aspect-square w-[120%] -translate-x-1/2 -translate-y-1/2 opacity-30" style={{ background: "radial-gradient(circle, #e5e5e5 0%, transparent 58%)" }} />
                      <span className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2"><LxMark size={hero ? 96 : 72} /></span>
                    </>
                  )}
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[var(--card-surface)] via-[var(--card-surface)]/90 to-transparent" />
                  <span className="absolute left-3 top-3 z-[1] flex flex-wrap gap-1.5">
                    {bonus > 0 && <span className="rounded-full border border-[var(--status-green)]/50 bg-[var(--card-surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-green)]">+{bonus}% more</span>}
                    {bestValue?.id === pack.id && <span className="rounded-full border border-[var(--line-strong)] bg-[var(--card-surface)] px-2 py-0.5 text-[11px] text-[var(--text-2)]">Best value</span>}
                  </span>
                  {on && <span className="absolute right-3 top-3 z-[1] grid size-6 place-items-center rounded-full bg-[var(--text)] text-[var(--bg)]"><Check className="size-4" aria-hidden="true" /></span>}
                  <span className="relative z-[1] flex items-end justify-between gap-3 p-4">
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="flex items-baseline gap-1.5"><span className={cn("font-bold leading-none text-[var(--text)]", hero ? "text-[34px]" : "text-[26px]")}>{pack.grantsLx.toLocaleString()}</span><span className="text-[13px] font-semibold text-[var(--text-muted)]">LX</span></span>
                      {(pack.name !== `${pack.grantsLx.toLocaleString()} LX` || pack.description) && <span className="truncate text-[11px] text-[var(--text-dim)]">{[pack.name !== `${pack.grantsLx.toLocaleString()} LX` ? pack.name : "", pack.description].filter(Boolean).join(" · ")}</span>}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-[17px] font-bold text-[var(--text)]">{mnt(pack.priceMnt)}</span>
                      <span className="text-[11px] text-[var(--text-dim)]">{mnt(Math.round((pack.priceMnt / pack.grantsLx) * 1000))} / 1,000 LX</span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <div className="lg:hidden">{summary}</div>

        <section aria-label="How it works" className="flex flex-col gap-3">
          <span className={label}>How it works</span>
          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3 rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] p-3.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[12px] font-semibold text-[var(--text-2)]">{index + 1}</span>
                <span className="self-center text-[13px] font-semibold text-[var(--text)]">{step.title}</span>
              </li>
            ))}
          </ol>
        </section>

        {user && topUps.length > 0 && (
          <section aria-label="My top-ups" className="flex flex-col gap-3">
            <span className={label}>My top-ups</span>
            <ul className="flex flex-col gap-2">
              {topUps.map((order) => {
                const at = stage(order.status)
                return (
                  <li key={order.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[var(--glass-line)] px-4 py-3">
                    <span className="flex min-w-[140px] flex-1 flex-col gap-0.5">
                      <span className="text-[13px] font-semibold text-[var(--text)]">{order.grantsLx.toLocaleString()} LX · {mnt(order.unitPriceMnt * order.quantity)}</span>
                      <RelativeTime value={order.createdAt} className="text-[11px] text-[var(--text-dim)]" />
                    </span>
                    {at < 0 ? (
                      <span className="rounded-full border border-[var(--line)] px-2.5 py-0.5 text-[11px] text-[var(--text-dim)]">Cancelled</span>
                    ) : (
                      <ol className="flex items-center gap-1.5 text-[11px]" aria-label="Progress">
                        {["Sent", "We called", "Paid · LX added"].map((step, index) => (
                          <li key={step} className={cn("flex items-center gap-1.5", index <= at ? "text-[var(--text)]" : "text-[var(--text-faint)]")}>
                            <span className={cn("size-2 rounded-full", index <= at ? "bg-[var(--text)]" : "bg-[var(--line-strong)]")} aria-hidden="true" />{step}
                            {index < 2 && <span className="h-px w-4 bg-[var(--line-strong)]" aria-hidden="true" />}
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>

      <aside aria-label="Your top-up" className="hidden lg:sticky lg:top-0 lg:block">{summary}</aside>

      <OrderDialog product={user ? ordering : null} onClose={() => setOrdering(null)} onDone={() => { setOrdering(null); void orders.refetch() }} />
    </div>
  )
}
