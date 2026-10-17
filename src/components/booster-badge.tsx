import boostSquare from "@/assets/boosters/boost-square.webp"

/** Shown next to a name while the player boosts the LEGACY-X Discord server (owner decision 2026-10-17); gone when the boosting stops. */
export function BoosterBadge() {
  return (
    <span title="Boosts the LEGACY-X Discord server" className="lx-boost-badge inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold">
      <img src={boostSquare} alt="" aria-hidden="true" className="size-3.5" />
      Booster
    </span>
  )
}
