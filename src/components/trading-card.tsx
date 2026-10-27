/**
 * A collectible card (owner request 2026-10-27): a CS2 map's own artwork over a solid fade, the name, and the card's rarity as a thin
 * line and a label. The rarity ladder is the cards' own (Standard, Select, Elite, Prime, Apex), not the CS2 skin rarities; its colours
 * are indicators only, never a surface.
 */
import type { CardRarity, TradingCardData } from "@/api/cards"
import { cs2MapArtwork } from "@/lib/cs2-map-art"
import { cn } from "@/lib/utils"

export const CARD_RARITY: Record<CardRarity, { label: string; colour: string }> = {
  standard: { label: "Standard", colour: "var(--text-2)" },
  select: { label: "Select", colour: "var(--tone-green)" },
  elite: { label: "Elite", colour: "var(--tone-sky)" },
  prime: { label: "Prime", colour: "var(--tone-violet)" },
  apex: { label: "Apex", colour: "var(--tone-amber)" },
}

export function TradingCard({ card, count, className, children }: { card: TradingCardData; count?: number; className?: string; children?: React.ReactNode }) {
  const rarity = CARD_RARITY[card.rarity]
  const art = cs2MapArtwork(card.mapKey)
  return (
    <article
      aria-label={`${card.name}, ${rarity.label}`}
      style={{ ["--rarity" as string]: rarity.colour }}
      className={cn("lx-sweep relative flex flex-col overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--card-surface)] transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-[var(--line-strong)] motion-reduce:transition-none motion-reduce:hover:translate-y-0", className)}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 z-[2] h-[2px]" style={{ background: "var(--rarity)" }} />
      <div className="relative aspect-[4/5] overflow-hidden">
        {art && <img src={art} alt="" loading="lazy" className="size-full object-cover" />}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[var(--card-surface)] via-[var(--card-surface)]/80 to-transparent" />
        {typeof count === "number" && count > 1 && <span className="absolute right-2 top-3 z-[1] rounded-full border border-[var(--line-strong)] bg-[var(--card-surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text)]">×{count}</span>}
        <div className="absolute inset-x-0 bottom-0 z-[1] flex flex-col gap-0.5 px-3 pb-2.5">
          <span className="truncate text-[15px] font-semibold text-[var(--text)]">{card.name}</span>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color: "var(--rarity)" }}>
            <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: "var(--rarity)" }} />{rarity.label}
          </span>
        </div>
      </div>
      {children}
    </article>
  )
}
