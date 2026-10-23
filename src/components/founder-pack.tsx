/**
 * The LEGACY-X Founder pack on the Shop's Featured tab (owner decision 2026-10-23): numbered, limited, bought by an order that staff
 * confirm (30,000₮ as the API says). Every number comes from the API; with no Founder product the card is not drawn.
 */
import { useState } from "react"
import { Check, Frame, Gem, Image as ImageIcon, Text } from "lucide-react"

import { shopGoodsService, type GoodsOrder, type GoodsProduct } from "@/api/shop-goods"
import { FramedAvatar } from "@/components/framed-avatar"
import { OrderDialog } from "@/components/shop-goods"
import { FounderBadge } from "@/components/founder-badge"
import { ProfileBanner } from "@/components/profile-banner"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

const CONTAINS = [
  { icon: Frame, label: "Founder frame" },
  { icon: Gem, label: "Founder badge with your number" },
  { icon: Text, label: "Founder title" },
  { icon: ImageIcon, label: "Gold Foil banner" },
]

export function FounderPack() {
  const { user } = useAuth()
  const { data: products, refetch } = useApiQuery<GoodsProduct[]>((signal) => shopGoodsService.products({ signal }), { queryKey: "shop-goods" })
  const { data: orders, refetch: refetchOrders } = useApiQuery<GoodsOrder[]>((signal) => shopGoodsService.myOrders({ signal }), { enabled: Boolean(user), queryKey: user ? `shop-orders:${user.id}` : "shop-orders:guest" })
  const [picked, setPicked] = useState<GoodsProduct | null>(null)
  const pack = (products ?? []).find((product) => product.kind === "founder" && product.founder)
  if (!pack?.founder) return null
  const info = pack.founder
  const mine = (orders ?? []).find((order) => order.productKind === "founder" && order.status !== "cancelled")
  const owned = mine && (mine.status === "paid" || mine.status === "shipped" || mine.status === "done")
  const ends = info.endsAt ? new Date(info.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : null

  return (
    <section aria-label="Founder pack" className="relative overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--founder-2)_40%,transparent)] bg-[var(--card-surface)]">
      <ProfileBanner fx="goldfoil" className="h-[150px] opacity-80" />
      <div className="relative grid gap-5 p-5 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] max-md:p-4">
        <div className="flex flex-col items-center justify-end gap-2 pt-16 max-md:pt-10">
          <FramedAvatar avatar={user?.avatar} name={user?.username ?? "Player"} frame="founder" size={170} />
          <FounderBadge />
        </div>
        <div className="flex min-w-0 flex-col gap-3 pt-2 md:pt-[120px]">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-[26px] font-bold leading-none tracking-[-0.4px] text-[var(--text)]">LEGACY-X <span className="lx-profile-title-founder">Founder</span></h2>
            <span className="text-[11px] font-semibold uppercase tracking-[2px] text-[var(--text-dim)]">Numbered · limited</span>
          </div>
          <p className="text-[13px] text-[var(--text-muted)]">One pack per player. Never sold again after it closes.</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {CONTAINS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 rounded-[10px] border border-[var(--line-soft)] bg-[var(--panel)] px-3 py-2 text-[13px] font-medium text-[var(--text)]">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)]"><Icon className="size-3.5" aria-hidden="true" /></span>
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-[22px] font-bold text-[var(--text)]">{pack.priceMnt.toLocaleString()}₮</span>
            <span className="text-xs text-[var(--text-dim)]">{info.remaining.toLocaleString()} of {info.limit.toLocaleString()} left{ends ? ` · until ${ends}` : ""}</span>
            <span className="flex-1" />
            {owned ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--status-green)]"><Check className="size-4" aria-hidden="true" />You are a Founder</span>
            ) : mine ? (
              <span className="text-[13px] font-semibold text-[var(--text-2)]">Your order is in. We will call you.</span>
            ) : (
              <button
                type="button"
                disabled={!info.open}
                onClick={() => setPicked(pack)}
                className={cn("lx-primary-button inline-flex h-10 items-center justify-center rounded-lg px-5 text-[13px] font-semibold", !info.open && "opacity-50")}
              >
                {info.open ? "Order the Founder pack" : info.remaining <= 0 ? "Sold out" : "Closed"}
              </button>
            )}
          </div>
        </div>
      </div>
      <OrderDialog product={picked} onClose={() => setPicked(null)} onDone={() => { setPicked(null); void refetch(); void refetchOrders() }} />
    </section>
  )
}
