import boostSquare from "@/assets/boosters/boost-square.webp"

/** Shown next to a name while the player boosts the LEGACY-X Discord server (owner decision 2026-10-17); gone when the boosting stops. */
export function BoosterBadge() {
  return (
    <span title="Boosts the LEGACY-X Discord server" className="lx-boost-badge inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold uppercase tracking-[1px]">
      <img src={boostSquare} alt="" aria-hidden="true" className="size-4" />
      Booster
      <span aria-hidden="true" className="lx-boost-star right-2 top-1" style={{ width: 6, height: 6, animationDelay: "0.8s" }} />
    </span>
  )
}
