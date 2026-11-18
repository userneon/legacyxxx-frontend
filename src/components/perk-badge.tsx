import ShinyText from "@/components/reactbits/shiny-text"
import prestige from "@/assets/ranks/emblem-2.webp"
import imperial from "@/assets/ranks/emblem-3.webp"
import eternal from "@/assets/ranks/emblem-4.webp"
import prime from "@/assets/ranks/emblem-1.webp"
import sovereign from "@/assets/ranks/emblem-5.webp"

export const PERK_EMBLEM: Record<string, string> = { tier1: prestige, tier2: imperial, tier3: eternal, tier4: prime, tier5: sovereign }

/**
 * The mark of a paid rank on the profile (owner request 2026-11-07): the tier's emblem (the owner-supplied translucent gem, cut from its sheet on 2026-11-13) and its name, in the tier's own
 * look: Prime copper, Prestige silver, Imperial violet and gold, Eternal gold and red, Sovereign diamond. Shown only while the rank runs (the API sends `perk` then).
 */
export function PerkBadge({ tier, name }: { tier: string; name: string }) {
  return (
    <span title={`${name}: a LXC in-game rank`} data-tier={tier} className="lx-perk-badge inline-flex h-7 items-center gap-1.5 rounded-full py-0 pl-1.5 pr-3 text-[11px] font-bold uppercase tracking-[1px]">
      {PERK_EMBLEM[tier] && <img src={PERK_EMBLEM[tier]} alt="" aria-hidden="true" width={34} height={34} className="relative z-[1] -my-[4px] -ml-1 size-[34px] object-contain drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]" />}
      {name}
    </span>
  )
}

export type PerkLook = { tier: string; name: string }

/** Each tier's own shine for React Bits' Shiny Text (the colours come from the owner's art, so they are palette-exempt): silver, violet with gold, gold with red. */
const SHINE: Record<string, { color: string; shine: string; glow: string }> = {
  // The colours follow the owner's five emblems (2026-11-17/18: "the banner and title do not match the rank"): Prestige steel and blue, Imperial gold, Eternal ice and a gold crown, Prime copper, Sovereign gold and crystal blue.
  tier1: { color: "#b9c9e8", shine: "#ffffff", glow: "#6f9bff" }, // palette-exempt: Prestige steel and blue
  tier2: { color: "#f2c14e", shine: "#fff3c4", glow: "#f6c945" }, // palette-exempt: Imperial gold
  tier3: { color: "#cfe6ff", shine: "#fff1c4", glow: "#6fb4ff" }, // palette-exempt: Eternal ice
  tier4: { color: "#c98a63", shine: "#f3d2bb", glow: "#b7673c" }, // palette-exempt: Prime copper
  tier5: { color: "#7fb0ff", shine: "#f6c945", glow: "#3d63ff" }, // palette-exempt: Sovereign crystal blue and gold
}

/**
 * A paid rank's mark next to a player's name in lists (owner request 2026-11-07: everywhere the name is, shining, each rank in its own colour): the tier's
 * emblem with a glow of its colour and, unless `compact`, the rank's name in React Bits' Shiny Text with the tier's own shine. Nothing renders without a rank.
 */
export function PerkMark({ perk, compact = false, size = 20 }: { perk?: PerkLook | null; compact?: boolean; size?: number }) {
  if (!perk || !PERK_EMBLEM[perk.tier]) return null
  const tone = SHINE[perk.tier] ?? SHINE.tier1
  return (
    <span title={`${perk.name}: a LXC in-game rank`} data-tier={perk.tier} className="inline-flex shrink-0 items-center gap-1 align-middle">
      <img src={PERK_EMBLEM[perk.tier]} alt="" aria-hidden="true" width={size} height={size} draggable={false} style={{ width: size, height: size, filter: `drop-shadow(0 0 5px color-mix(in oklab, ${tone.glow} 70%, transparent))` }} className="object-contain" />
      {!compact && <ShinyText text={perk.name.toUpperCase()} color={tone.color} shineColor={tone.shine} speed={3.2} delay={0.8} glow={0.5} className="text-[10px] font-bold tracking-[1px]" />}
    </span>
  )
}

/** The rank's name as a title under a player's name (the profile's title line, the Shop's preview): React Bits' Shiny Text in the tier's own colours. */
export function PerkTitle({ perk }: { perk: PerkLook }) {
  const tone = SHINE[perk.tier] ?? SHINE.tier1
  return <ShinyText text={perk.name.toUpperCase()} color={tone.color} shineColor={tone.shine} speed={3.2} delay={0.8} glow={0.5} className="text-[11px] font-semibold tracking-[3px]" />
}
