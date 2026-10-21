import { useState } from "react"
import { Package, Pencil, Plus, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { shopGoodsService, type GoodsOrderStatus, type GoodsProductInput, type StaffGoodsProduct } from "@/api/shop-goods"
import { RelativeTime } from "@/components/relative-time"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

const input = "h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:border-[var(--text-faint)] focus:outline-none"
const secondary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:opacity-50"
const label = "text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]"

const STATUSES: Array<{ value: GoodsOrderStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "paid", label: "Paid" },
  { value: "shipped", label: "Shipped" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
]
const mnt = (value: number) => `${value.toLocaleString()}₮`

type Draft = GoodsProductInput & { slug: string; isNew: boolean }
const EMPTY: Draft = { slug: "", isNew: true, name: "", description: "", kind: "charm", grantsLx: 0, priceMnt: 0, imageUrl: null, stock: 0, enabled: true, sort: 0 }

/** Staff → Shop: the orders players asked for (call them, take the payment, move the status along) and the products on sale. Owners and Managers. */
export function StaffShop() {
  const [filter, setFilter] = useState<GoodsOrderStatus | "open">("open")
  const orders = useApiQuery((signal) => shopGoodsService.staffOrders(filter === "open" ? undefined : filter, { signal }), { queryKey: `staff-shop-orders:${filter}` })
  const products = useApiQuery((signal) => shopGoodsService.staffProducts({ signal }), { queryKey: "staff-shop-products" })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)

  const move = async (orderId: string, status: GoodsOrderStatus) => {
    setBusy(true)
    try {
      await shopGoodsService.setOrderStatus(orderId, status)
      orders.refetch()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not change the status")
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!draft) return
    if (!/^[a-z0-9-]{2,40}$/.test(draft.slug)) { toast.error("The short name needs 2-40 small letters, numbers or dashes"); return }
    if (draft.name.trim().length < 2) { toast.error("Give the product a name"); return }
    if (draft.imageUrl && !/^https:\/\//.test(draft.imageUrl)) { toast.error("The picture address must start with https://"); return }
    setBusy(true)
    try {
      const { slug, isNew: _isNew, ...body } = draft
      await shopGoodsService.saveProduct(slug, { ...body, name: body.name.trim(), description: body.description.trim(), imageUrl: body.imageUrl?.trim() || null })
      toast.success("Saved")
      setDraft(null)
      products.refetch()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not save the product")
    } finally {
      setBusy(false)
    }
  }
  const edit = (product: StaffGoodsProduct) => setDraft({ slug: product.slug, isNew: false, name: product.name, description: product.description, kind: product.kind, grantsLx: product.grantsLx, priceMnt: product.priceMnt, imageUrl: product.imageUrl, stock: product.stock, enabled: product.enabled, sort: product.sort })

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-5 max-md:px-4">
      <section aria-label="Orders" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={label}>Orders</span>
          <span className="flex-1" />
          {([["open", "Open"], ...STATUSES.map((entry) => [entry.value, entry.label])] as Array<[GoodsOrderStatus | "open", string]>).map(([value, text]) => (
            <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={cn("h-8 rounded-full border px-3 text-xs transition-colors", filter === value ? "border-[var(--text)] bg-[var(--raised)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-dim)] hover:border-[var(--line-strong)] hover:text-[var(--text)]")}>{text}</button>
          ))}
        </div>
        {orders.loading && !orders.data ? (
          <div className="flex flex-col gap-2" aria-hidden="true">{[0, 1].map((index) => <Skeleton key={index} className="h-20 rounded-xl bg-[var(--card-surface)]" />)}</div>
        ) : orders.error && !orders.data ? (
          <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load the orders.<button type="button" onClick={orders.refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
        ) : (orders.data?.length ?? 0) === 0 ? (
          <p className="py-6 text-[13px] text-[var(--text-dim)]">No orders here.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {orders.data!.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--card-surface)] px-4 py-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[13px] font-semibold text-[var(--text)]">{order.productName} × {order.quantity} · {mnt(order.unitPriceMnt * order.quantity)}</span>
                  <span className="truncate text-xs text-[var(--text-dim)]">{order.player.username} · {order.player.steamId} · <a href={`tel:${order.phone}`} className="text-[var(--text-2)] hover:text-[var(--text)]">{order.phone}</a></span>
                  {order.note && <span className="truncate text-xs text-[var(--text-muted)]">{order.note}</span>}
                  <RelativeTime value={order.createdAt} className="text-[11px] text-[var(--text-dim)]" />
                </span>
                <select aria-label="Order status" value={order.status} disabled={busy} onChange={(event) => void move(order.id, event.target.value as GoodsOrderStatus)} className={cn(input, "w-[140px]")}>
                  {STATUSES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Products" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className={label}>Products</span>
          {!draft && <button type="button" onClick={() => setDraft(EMPTY)} className="lx-primary-button inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold"><Plus className="size-4" />Add product</button>}
        </div>

        {draft && (
          <div className="relative lx-add-box flex flex-col gap-3 rounded-2xl border p-[18px]">
            <div className="flex items-center gap-2.5"><span className="lx-add-icon"><Package className="size-4" /></span><span className="text-[15px] font-semibold text-[var(--text)]">{draft.isNew ? "Add product" : "Edit product"}</span></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Short name (used in the address, cannot change)
                <input className={input} value={draft.slug} disabled={!draft.isNew} maxLength={40} onChange={(event) => setDraft({ ...draft, slug: event.target.value.toLowerCase() })} placeholder="legacyx-nfc-charm" />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Name
                <input className={input} value={draft.name} maxLength={80} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="LEGACY-X NFC charm" />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Description ({600 - draft.description.length} left)
              <input className={input} value={draft.description} maxLength={600} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            </label>
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Type
                <select className={input} value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as Draft["kind"] })}>
                  <option value="charm">NFC charm</option><option value="sticker">Sticker</option><option value="other">Other</option><option value="lx">LX top-up package</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Price (₮)
                <input className={input} type="number" min={0} value={draft.priceMnt} onChange={(event) => setDraft({ ...draft, priceMnt: Math.max(0, Math.floor(Number(event.target.value) || 0)) })} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">In stock
                <input className={input} type="number" min={0} value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: Math.max(0, Math.floor(Number(event.target.value) || 0)) })} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Order in the list
                <input className={input} type="number" value={draft.sort} onChange={(event) => setDraft({ ...draft, sort: Math.floor(Number(event.target.value) || 0) })} />
              </label>
            </div>
            {draft.kind === "lx" && (
              <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">LX the package gives (credited once when the order is marked Paid)
                <input className={input} type="number" min={0} value={draft.grantsLx} onChange={(event) => setDraft({ ...draft, grantsLx: Math.max(0, Math.floor(Number(event.target.value) || 0)) })} />
              </label>
            )}
            <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Picture address (https://…)
              <input className={input} value={draft.imageUrl ?? ""} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value || null })} placeholder="https://…" />
            </label>
            <label className="flex items-center gap-2 text-[13px] text-[var(--text-2)]"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />Show in the Shop</label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDraft(null)} className={secondary}>Cancel</button>
              <button type="button" disabled={busy} onClick={() => void save()} className="lx-primary-button inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-semibold disabled:opacity-50">Save</button>
            </div>
          </div>
        )}

        {products.loading && !products.data ? (
          <Skeleton className="h-14 rounded-xl bg-[var(--card-surface)]" />
        ) : products.error && !products.data ? (
          <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load the products.<button type="button" onClick={products.refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
        ) : (products.data?.length ?? 0) === 0 ? (
          <p className="py-6 text-[13px] text-[var(--text-dim)]">No products yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {products.data!.map((product) => (
              <li key={product.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--card-surface)] px-4 py-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[13px] font-semibold text-[var(--text)]">{product.name}</span>
                  <span className="truncate text-xs text-[var(--text-dim)]">{mnt(product.priceMnt)}{product.kind === "lx" ? ` · gives ${product.grantsLx.toLocaleString()} LX` : ` · ${product.stock} in stock`} · {product.enabled ? "Shown" : "Hidden"}</span>
                </span>
                <button type="button" aria-label={`Edit ${product.name}`} onClick={() => edit(product)} className={cn(secondary, "w-9 px-0")}><Pencil className="size-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
