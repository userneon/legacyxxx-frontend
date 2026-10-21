/**
 * The Shop's Goods tab: real things (NFC charms, stickers). A player asks for one with a phone number; staff call, take the payment
 * and send it. Everything shown comes from the API; an empty shop says so instead of showing sample items.
 */
import { useState } from "react"
import { Package, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { LxMark } from "@/components/lx-mark"
import { shopGoodsService, type GoodsOrder, type GoodsOrderStatus, type GoodsProduct } from "@/api/shop-goods"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { RelativeTime } from "@/components/relative-time"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"

const STATUS_LABEL: Record<GoodsOrderStatus, string> = {
  new: "Waiting for us",
  contacted: "We called you",
  paid: "Paid",
  shipped: "On its way",
  done: "Delivered",
  cancelled: "Cancelled",
}

const mnt = (value: number) => `${value.toLocaleString()}₮`
const field = "h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50"

/** `goods`: the real items; `lx`: the LX top-up packages (paid like goods, then the LX arrive in the wallet). */
export function ShopGoods({ mode = "goods" }: { mode?: "goods" | "lx" }) {
  const { user } = useAuth()
  const { data: products, loading, error, refetch } = useApiQuery<GoodsProduct[]>((signal) => shopGoodsService.products({ signal }), { queryKey: "shop-goods" })
  const { data: orders, refetch: refetchOrders } = useApiQuery<GoodsOrder[]>((signal) => shopGoodsService.myOrders({ signal }), { enabled: Boolean(user), queryKey: user ? `shop-orders:${user.id}` : "shop-orders:guest" })
  const [picked, setPicked] = useState<GoodsProduct | null>(null)
  const shown = (products ?? []).filter((product) => (product.kind === "lx") === (mode === "lx"))

  if (loading) return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{[0, 1, 2, 3].map((n) => <Skeleton key={n} className="h-[280px] rounded-xl" />)}</div>
  if (error || !products) {
    return <p className="flex items-center justify-center gap-3 py-24 text-[13px] text-[var(--text-dim)]">Could not load the goods.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Goods">
        {shown.length === 0 ? (
          <p className="py-8 text-[13px] text-[var(--text-dim)]">{mode === "lx" ? "No top-up packages right now." : "No goods are on sale right now."}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {shown.map((product) => (
              <li key={product.id} className="flex flex-col overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
                <div className="grid h-[170px] place-items-center bg-[var(--card-surface)]">
                  {product.kind === "lx" ? <span className="flex flex-col items-center gap-2"><LxMark size={56} /><span className="text-[26px] font-bold leading-none text-[var(--text)]">{product.grantsLx.toLocaleString()}</span></span> : product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" className="max-h-full max-w-full object-contain" /> : <Package className="size-8 text-[var(--text-faint)]" aria-hidden="true" />}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">{product.kind === "lx" ? "LX top-up" : product.kind === "charm" ? "NFC charm" : product.kind === "sticker" ? "Sticker" : "Goods"}</span>
                  <span className="text-[15px] font-semibold text-[var(--text)]">{product.name}</span>
                  {product.description && <span className="text-[13px] leading-relaxed text-[var(--text-muted)]">{product.description}</span>}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-[15px] font-semibold text-[var(--text)]">{mnt(product.priceMnt)}</span>
                    {product.kind !== "lx" && <span className="text-[11px] text-[var(--text-dim)]">{product.stock > 0 ? `${product.stock} left` : "Sold out"}</span>}
                  </div>
                  <button type="button" disabled={product.stock < 1} onClick={() => (user ? setPicked(product) : toast.error("Sign in with Steam to order."))} className="lx-primary-button inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-[13px] font-semibold disabled:opacity-50">
                    {product.stock < 1 ? "Sold out" : product.kind === "lx" ? "Top up" : "Order"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {user && orders && orders.length > 0 && (
        <section aria-label="My orders" className="flex flex-col gap-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">My orders</span>
          <ul className="divide-y divide-[var(--line-soft)] overflow-hidden rounded-xl border border-[var(--glass-line)]">
            {orders.map((order) => (
              <li key={order.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[13px] text-[var(--text)]">{order.productName} × {order.quantity}</span>
                  <RelativeTime value={order.createdAt} className="text-[11px] text-[var(--text-dim)]" />
                </span>
                <span className="shrink-0 text-[13px] text-[var(--text-muted)]">{mnt(order.unitPriceMnt * order.quantity)}</span>
                <span className="shrink-0 rounded-full border border-[var(--line)] px-2.5 py-0.5 text-[11px] text-[var(--text-2)]">{STATUS_LABEL[order.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <OrderDialog product={picked} onClose={() => setPicked(null)} onDone={() => { setPicked(null); void refetchOrders(); void refetch() }} />
    </div>
  )
}

function OrderDialog({ product, onClose, onDone }: { product: GoodsProduct | null; onClose: () => void; onDone: () => void }) {
  const [quantity, setQuantity] = useState(1)
  const [phone, setPhone] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const valid = /^[0-9+ -]{8,20}$/.test(phone.trim())

  const submit = async () => {
    if (!product || !valid || busy) return
    setBusy(true)
    try {
      await shopGoodsService.order({ productId: product.id, quantity, phone: phone.trim(), note: note.trim() })
      toast.success("We got your order. We will call you.")
      setQuantity(1); setNote("")
      onDone()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not send the order. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={Boolean(product)} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{product?.kind === "lx" ? "Top up" : "Order"} {product?.name}</DialogTitle>
          <DialogDescription>{product?.kind === "lx" ? "You pay when we call: bank transfer or QPay. The LX arrive in your wallet as soon as we confirm the payment. Nothing is charged here." : "You pay when we call: bank transfer or QPay. Nothing is charged here."}</DialogDescription>
        </DialogHeader>
        {product && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">
              How many
              <select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className={field}>
                {Array.from({ length: Math.min(10, product.stock) }, (_, index) => index + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">
              Phone number
              <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" maxLength={20} placeholder="99112233" className={field} />
            </label>
            <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">
              Note (optional)
              <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder="Where to deliver, best time to call" className={field} />
            </label>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[15px] font-semibold text-[var(--text)]">{mnt(product.priceMnt * quantity)}</span>
              <button type="button" disabled={!valid || busy} onClick={submit} className="lx-primary-button inline-flex h-10 items-center justify-center rounded-lg px-5 text-[13px] font-semibold disabled:opacity-50">{busy ? "Sending" : "Send order"}</button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
