import prestige from "@/assets/ranks/crown-prestige.webp"
import imperial from "@/assets/ranks/crown-imperial.webp"
import eternal from "@/assets/ranks/crown-eternal.webp"

const CROWN: Record<string, string> = { tier1: prestige, tier2: imperial, tier3: eternal }

/**
 * The mark of a paid rank on the profile (owner request 2026-11-07): the tier's crown from the owner-supplied card art and its name, in the tier's own
 * look: Prestige silver, Imperial violet and gold, Eternal gold and red. Shown only while the rank runs (the API sends `perk` then).
 */
export function PerkBadge({ tier, name }: { tier: string; name: string }) {
  return (
    <span title={`${name}: a LEGACY-X in-game rank`} data-tier={tier} className="lx-perk-badge inline-flex h-7 items-center gap-1.5 rounded-full py-0 pl-1 pr-3 text-[11px] font-bold uppercase tracking-[1px]">
      {CROWN[tier] && <img src={CROWN[tier]} alt="" aria-hidden="true" width={30} height={24} className="h-6 w-[30px] rounded-full object-cover" />}
      {name}
    </span>
  )
}
