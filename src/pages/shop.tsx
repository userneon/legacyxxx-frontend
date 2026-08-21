import { useState, useMemo } from "react"
import { Coins, Sparkles, Tag, ShoppingBag } from "lucide-react"

import { cn } from "@/lib/utils"
import { storeService, walletService } from "@/api"
import type { ShopItem, ShopRarity, WalletBalance } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useApiQuery } from "@/hooks/use-api-query"
import { QueryState } from "@/components/query-state"

type ShopCategory = "All" | "Weapon" | "Knife" | "Gloves" | "Agent"

const CATEGORIES: ShopCategory[] = ["All", "Weapon", "Knife", "Gloves", "Agent"]

const RARITY_ORDER: Record<ShopRarity, number> = {
  Legendary: 0,
  Epic: 1,
  Rare: 2,
  Common: 3,
}

const RARITY_COLORS: Record<ShopRarity, string> = {
  Common: "text-muted-foreground border-muted-foreground/30",
  Rare: "text-chart-2 border-chart-2/40",
  Epic: "text-chart-1 border-chart-1/40",
  Legendary: "text-chart-4 border-chart-4/40",
}

export function ShopPage() {
  const [category, setCategory] = useState<ShopCategory>("All")

  const { data: items, loading, error, refetch } = useApiQuery<ShopItem[]>((signal) =>
    storeService.getItems(undefined, { signal }),
  )
  const { data: balanceData } = useApiQuery<WalletBalance>((signal) =>
    walletService.getBalance({ signal }),
  )

  const allItems = items ?? []
  const balance = balanceData?.balance ?? 0

  const filtered = useMemo(() => {
    const catFiltered = category === "All"
      ? allItems
      : allItems.filter((item) => item.category === category)
    return [...catFiltered].sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity])
  }, [allItems, category])

  const featured = allItems.find((i) => i.rarity === "Legendary")

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex justify-end">
        <div className="glass flex items-center gap-2 rounded-lg px-4 py-2">
          <Coins className="size-4 text-chart-4" />
          <span className="text-sm font-bold tabular-nums text-muted-foreground">
            {balance > 0 ? balance.toLocaleString() : "—"}
          </span>
        </div>
      </div>

      {/* Featured item */}
      {featured && (
        <div className="glass shiny glow-violet relative overflow-hidden rounded-xl">
          <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:gap-8">
            {/* Image */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-secondary md:w-72 shrink-0">
              <img
                src={featured.image}
                alt={featured.name}
                className="size-full object-cover"
              />
              <Badge className={cn(
                "absolute top-3 left-3 text-[10px] font-bold uppercase",
                RARITY_COLORS[featured.rarity]
              )}>
                {featured.rarity}
              </Badge>
            </div>

            {/* Details */}
            <div className="flex flex-col gap-3 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-chart-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-chart-4">Featured Item</span>
              </div>
              <h2 className="text-xl font-bold">{featured.name}</h2>
              <p className="text-sm text-muted-foreground">
                A premium {featured.category.toLowerCase()} skin. One of the rarest items in the shop. Limited availability.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Tag className="size-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{featured.category}</span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <Coins className="size-5 text-chart-4" />
                  <span className="text-2xl font-bold tabular-nums">{featured.price.toLocaleString()}</span>
                </div>
                <Button size="lg" onClick={() => void storeService.purchaseItem(featured.id)}>
                  <ShoppingBag className="size-4" />
                  Buy Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const count = cat === "All"
            ? allItems.length
            : allItems.filter((i) => i.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "glass flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-all",
                category === cat
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              <span>{cat}</span>
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                category === cat ? "bg-primary-foreground/20" : "bg-secondary"
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <QueryState
        loading={loading}
        error={error}
        empty={!loading && !error && filtered.length === 0}
        emptyMessage="No items available in the shop right now."
        onRetry={refetch}
      />

      {/* Items grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <ShopCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function ShopCard({ item }: { item: ShopItem }) {
  const [purchasing, setPurchasing] = useState(false)

  const handlePurchase = () => {
    setPurchasing(true)
    void storeService
      .purchaseItem(item.id)
      .finally(() => setPurchasing(false))
  }

  return (
    <div className={cn(
      "glass shiny group flex flex-col overflow-hidden rounded-xl transition-all hover:glow-violet hover:scale-[1.01]"
    )}>
      {/* Image with gradient overlay */}
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <img
          src={item.image}
          alt={item.name}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card/90 to-transparent" />
        <Badge className={cn(
          "absolute top-3 right-3 text-[10px] font-bold uppercase backdrop-blur-md bg-card/70",
          RARITY_COLORS[item.rarity]
        )}>
          {item.rarity}
        </Badge>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 p-4">
        <div>
          <h3 className="font-semibold text-sm">{item.name}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <Tag className="size-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{item.category}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <Coins className="size-4 text-muted-foreground" />
            <span className="text-sm font-bold tabular-nums">{item.price.toLocaleString()}</span>
          </div>
          <Button size="sm" variant="outline" className="h-8" onClick={handlePurchase} disabled={purchasing}>
            <ShoppingBag className="size-3.5" />
            {purchasing ? "Buying..." : "Buy"}
          </Button>
        </div>
      </div>
    </div>
  )
}
