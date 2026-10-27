/**
 * Shop → Cards (owner request 2026-10-27): the cards with today's real prices. A price rises with every copy players hold, a sale pays
 * 90% of the copy it takes back. The price on screen is sent with the trade, so a price that moved meanwhile is refused, never charged.
 */
import { useState } from "react"
import { RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { cardsService, type TradingCardData } from "@/api/cards"
import { Skeleton } from "@/components/ui/skeleton"
import { TradingCard } from "@/components/trading-card"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

const button = "inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"

export function ShopCards({ balance, onChanged }: { balance: number | null; onChanged: () => void }) {
  const { user } = useAuth()
  const { data, loading, error, refetch } = useApiQuery((signal) => cardsService.list({ signal }), { queryKey: user ? `cards:${user.id}` : "cards:guest" })
  const [busy, setBusy] = useState<string | null>(null)

  const trade = async (card: TradingCardData, side: "buy" | "sell") => {
    setBusy(card.id)
    try {
      const result = side === "buy" ? await cardsService.buy(card.id, card.price) : await cardsService.sell(card.id, card.sellPrice)
      toast.success(side === "buy" ? `${card.name} is yours for ${result.price.toLocaleString()} LX` : `${card.name} sold for ${result.price.toLocaleString()} LX`)
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not complete that")
    } finally {
      setBusy(null)
      await Promise.all([refetch(), Promise.resolve(onChanged())])
    }
  }

  if (loading && !data) return <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">{[0, 1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-[360px] rounded-[10px]" />)}</div>
  if (error || !data) {
    return <p className="flex items-center justify-center gap-3 py-24 text-[13px] text-[var(--text-dim)]">Could not load the cards.<button type="button" onClick={() => void refetch()} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-4" aria-hidden="true" />Retry</button></p>
  }
  const percent = Math.round((1 - data.sellShare) * 100)
  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[720px] text-[13px] leading-relaxed text-[var(--text-muted)]">
        Collect map cards. There is no limit on copies, but the more copies players hold, the dearer the next one is; when players sell, it gets cheaper.
        Selling pays back the price of the copy it takes, minus {percent}%.
      </p>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {data.cards.map((card) => {
          const afford = balance === null || balance >= card.price
          return (
            <li key={card.id}>
              <TradingCard card={card} count={card.qty} className="h-full">
                <div className="flex flex-col gap-2 p-3">
                  <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="text-[var(--text-muted)]">Price</span>
                    <span className="lx-shop-price font-semibold text-[var(--text)]">{card.price.toLocaleString()} LX</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 text-[11px] text-[var(--text-dim)]"><span>{card.held.toLocaleString()} held</span><span>{card.qty > 0 ? `You hold ${card.qty}` : ""}</span></div>
                  <div className="flex gap-2">
                    <button type="button" disabled={!user || !card.enabled || !afford || busy !== null} onClick={() => void trade(card, "buy")} className={cn(button, "lx-primary-button")}>{!user ? "Sign in" : afford ? "Buy" : "Not enough LX"}</button>
                    {card.qty > 0 && <button type="button" disabled={busy !== null} onClick={() => void trade(card, "sell")} className={cn(button, "border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)] hover:border-[var(--line-strong)] hover:text-[var(--text)]")}>Sell {card.sellPrice.toLocaleString()}</button>}
                  </div>
                </div>
              </TradingCard>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
