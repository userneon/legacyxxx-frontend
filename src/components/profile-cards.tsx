/** The Cards tab on a profile (owner request 2026-10-27): the cards a player holds, four to a row, rarest first. Real holdings from the API. */
import { Link } from "react-router-dom"
import { RotateCcw } from "lucide-react"

import { cardsService } from "@/api/cards"
import { Skeleton } from "@/components/ui/skeleton"
import { TradingCard } from "@/components/trading-card"
import { useApiQuery } from "@/hooks/use-api-query"

const ORDER = { apex: 0, prime: 1, elite: 2, select: 3, standard: 4 } as const

export function ProfileCards({ userId, isOwner }: { userId: string; isOwner: boolean }) {
  const { data, loading, error, refetch } = useApiQuery((signal) => cardsService.ofPlayer(userId, { signal }), { queryKey: `profile-cards:${userId}` })
  if (loading && !data) return <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((n) => <Skeleton key={n} className="aspect-[4/5] rounded-[10px]" />)}</div>
  if (error || !data) {
    return <div role="alert" className="flex items-center gap-3 text-[13px] text-[var(--text-muted)]">Could not load the cards.<button type="button" onClick={() => void refetch()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)]"><RotateCcw className="size-4" aria-hidden="true" />Retry</button></div>
  }
  if (data.cards.length === 0) {
    return <p className="text-[13px] text-[var(--text-dim)]">{isOwner ? <>You hold no cards yet. <Link to="/shop/cards" className="text-[var(--text-2)] underline-offset-2 hover:underline">Find them in the Shop</Link>.</> : "This player holds no cards."}</p>
  }
  const cards = [...data.cards].sort((a, b) => ORDER[a.rarity] - ORDER[b.rarity] || a.name.localeCompare(b.name))
  return (
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => <li key={card.id}><TradingCard card={card} count={card.qty} /></li>)}
    </ul>
  )
}
