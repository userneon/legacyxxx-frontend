import boostSquare from "@/assets/boosters/boost-square.webp"

const PLACE_LABEL = { 1: "1st Booster", 2: "2nd Booster", 3: "3rd Booster" } as const

/**
 * Shown next to a name while the player boosts the LEGACY-X Discord server (owner decision 2026-10-17); gone when the boosting stops.
 * One of the three top boosters gets gold, silver or bronze with their place (owner request 2026-10-23).
 */
export function BoosterBadge({ place }: { place?: 1 | 2 | 3 | null }) {
  return (
    <span title={place ? `${PLACE_LABEL[place]} of the LEGACY-X Discord server` : "Boosts the LEGACY-X Discord server"} data-place={place ?? undefined} className="lx-boost-badge inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold uppercase tracking-[1px]">
      <img src={boostSquare} alt="" aria-hidden="true" className="size-4" />
      {place ? PLACE_LABEL[place] : "Booster"}
      <span aria-hidden="true" className="lx-boost-star right-2 top-1" style={{ width: 6, height: 6, animationDelay: "0.8s" }} />
    </span>
  )
}
