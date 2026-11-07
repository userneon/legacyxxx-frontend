import prestige from "@/assets/ranks/emblem-prestige.webp"
import imperial from "@/assets/ranks/emblem-imperial.webp"
import eternal from "@/assets/ranks/emblem-eternal.webp"

export const PERK_EMBLEM: Record<string, string> = { tier1: prestige, tier2: imperial, tier3: eternal }

/**
 * The mark of a paid rank on the profile (owner request 2026-11-07): the tier's emblem (the owner-supplied crown and laurels, transparent) and its name, in the tier's own
 * look: Prestige silver, Imperial violet and gold, Eternal gold and red. Shown only while the rank runs (the API sends `perk` then).
 */
export function PerkBadge({ tier, name }: { tier: string; name: string }) {
  return (
    <span title={`${name}: a LEGACY-X in-game rank`} data-tier={tier} className="lx-perk-badge inline-flex h-7 items-center gap-1.5 rounded-full py-0 pl-1.5 pr-3 text-[11px] font-bold uppercase tracking-[1px]">
      {PERK_EMBLEM[tier] && <img src={PERK_EMBLEM[tier]} alt="" aria-hidden="true" width={34} height={34} className="relative z-[1] -my-[4px] -ml-1 size-[34px] object-contain drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]" />}
      {name}
    </span>
  )
}
