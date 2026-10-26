/**
 * The LEGACY-X Genesis pack on the Shop's Featured tab (owner decision 2026-10-23): numbered, limited. Since 2026-10-26 it is bought with LX
 * from the wallet (4,500 LX, the 30,000₮ it used to cost) and given at once. Every number comes from the API; with no Genesis product the card is not drawn.
 */
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Check, Frame, Gem, Image as ImageIcon, Text } from "lucide-react"

import { walletService, type Wallet } from "@/api"
import { cosmeticsService, type Cosmetics } from "@/api/cosmetics"
import { shopGoodsService, type GoodsOrder, type GoodsProduct } from "@/api/shop-goods"
import { FramedAvatar } from "@/components/framed-avatar"
import { LxMark } from "@/components/lx-mark"
import { FounderBadge } from "@/components/founder-badge"
import { ProfileBanner } from "@/components/profile-banner"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

const CONTAINS = [
  { icon: Frame, label: "Genesis frame" },
  { icon: Gem, label: "Genesis badge with your number" },
  { icon: Text, label: "Genesis title" },
  { icon: ImageIcon, label: "Gold Foil banner" },
]

export function FounderPack() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: products, loading: productsLoading, refetch } = useApiQuery<GoodsProduct[]>((signal) => shopGoodsService.products({ signal }), { queryKey: "shop-goods" })
  const { data: orders, refetch: refetchOrders } = useApiQuery<GoodsOrder[]>((signal) => shopGoodsService.myOrders({ signal }), { enabled: Boolean(user), queryKey: user ? `shop-orders:${user.id}` : "shop-orders:guest" })
  const { data: cosmetics, refetch: refetchCosmetics } = useApiQuery<Cosmetics>((signal) => cosmeticsService.getMine({ signal }), { enabled: Boolean(user), queryKey: user ? `cosmetics:${user.id}` : "cosmetics:guest" })
  const { data: wallet, refetch: refetchWallet } = useApiQuery<Wallet>((signal) => walletService.getMine({ signal }), { enabled: Boolean(user), queryKey: user ? `wallet:${user.id}` : "wallet:guest" })
  const [busy, setBusy] = useState(false)
  const pack = (products ?? []).find((product) => product.kind === "founder" && product.founder)
  // Same height as the card while the shop loads, so the items below do not jump down when it appears.
  if (!products && productsLoading) return <div aria-hidden="true" className="h-[460px] animate-pulse rounded-2xl border border-[var(--line-soft)] bg-[var(--card-surface)]" />
  if (!pack?.founder) return null
  const info = pack.founder
  const mine = (orders ?? []).find((order) => order.productKind === "founder" && order.status !== "cancelled")
  const confirmed = Boolean(mine && (mine.status === "paid" || mine.status === "shipped" || mine.status === "done"))
  // "In Genesis" means the pack was really given: the player owns the Genesis frame (the pack's own cosmetic, never sold apart from it).
  const owned = Boolean(cosmetics?.frames.find((frame) => frame.id === "founder")?.owned) || (mine ? (mine.founderNumber !== undefined ? mine.founderNumber !== null : confirmed) : false)
  const balance = wallet?.balance ?? null
  const afford = balance === null || balance >= info.priceLx
  const buy = async () => {
    if (!user) return
    if (!afford) { navigate("/wallet/top-up"); return }
    setBusy(true)
    try {
      const bought = await shopGoodsService.buyFounder()
      window.dispatchEvent(new Event("legacyx:wallet-changed"))
      toast.success(`You are Genesis ${bought.label}`, { description: "The frame, banner and title are yours. Wear them in Profile → Appearance." })
      await Promise.all([refetch(), refetchOrders(), refetchCosmetics(), refetchWallet()])
    } catch (caught) {
      toast.error("Could not get the pack", { description: caught instanceof Error ? caught.message : "Try again in a moment." })
    } finally {
      setBusy(false)
    }
  }
  const ends = info.endsAt ? new Date(info.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : null

  return (
    <section aria-label="Genesis pack" className="relative overflow-hidden rounded-2xl border border-[color-mix(in_oklab,var(--founder-2)_40%,transparent)] bg-[var(--card-surface)]">
      <ProfileBanner fx="goldfoil" fade className="h-[150px] opacity-80" />
      <div className="relative grid gap-5 p-5 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] max-md:p-4">
        <div className="flex flex-col items-center justify-end gap-2 pt-16 max-md:pt-10">
          <FramedAvatar avatar={user?.avatar} name={user?.username ?? "Player"} frame="founder" size={170} />
          <FounderBadge />
        </div>
        <div className="flex min-w-0 flex-col gap-3 pt-2 md:pt-[120px]">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-[26px] font-bold leading-none tracking-[-0.4px] text-[var(--text)]">LEGACY-X <span className="lx-profile-title-founder">Genesis</span></h2>
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
            <span className="inline-flex items-center gap-1.5 text-[22px] font-bold text-[var(--text)]"><LxMark size={20} />{info.priceLx.toLocaleString()}</span>
            <span className="text-xs text-[var(--text-dim)]">{info.remaining.toLocaleString()} of {info.limit.toLocaleString()} left{ends ? ` · until ${ends}` : ""}</span>
            <span className="flex-1" />
            {owned ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--status-green)]"><Check className="size-4" aria-hidden="true" />You are in Genesis</span>
            ) : mine ? (
              <span className="text-[13px] font-semibold text-[var(--text-2)]">{confirmed ? "Your order is confirmed. The pack is being applied." : "Your order is in. We will call you."}</span>
            ) : (
              <button
                type="button"
                disabled={!info.open || busy || !user}
                onClick={() => void buy()}
                className={cn("lx-primary-button inline-flex h-10 items-center justify-center rounded-lg px-5 text-[13px] font-semibold", !info.open && "opacity-50")}
              >
                {!info.open ? (info.remaining <= 0 ? "Sold out" : "Closed") : !user ? "Sign in to get it" : afford ? `Get the Genesis pack for ${info.priceLx.toLocaleString()} LX` : `Top up ${(info.priceLx - (balance ?? 0)).toLocaleString()} more LX`}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
