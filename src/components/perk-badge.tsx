import ShinyText from "@/components/reactbits/shiny-text"
import prestige from "@/assets/ranks/emblem-prestige.webp"
import imperial from "@/assets/ranks/emblem-imperial.webp"
import eternal from "@/assets/ranks/emblem-eternal.webp"
import prime from "@/assets/ranks/emblem-prime.webp"
import sovereign from "@/assets/ranks/emblem-sovereign.webp"

export const PERK_EMBLEM: Record<string, string> = { tier1: prestige, tier2: imperial, tier3: eternal, tier4: prime, tier5: sovereign }

/**
 * The mark of a paid rank on the profile (owner request 2026-11-07): the tier's emblem (the owner-supplied crown and laurels, transparent) and its name, in the tier's own
 * look: Prime copper, Prestige silver, Imperial violet and gold, Eternal gold and red, Sovereign diamond. Shown only while the rank runs (the API sends `perk` then).
 */
export function PerkBadge({ tier, name }: { tier: string; name: string }) {
  return (
    <span title={`${name}: a LEGACY-X in-game rank`} data-tier={tier} className="lx-perk-badge inline-flex h-7 items-center gap-1.5 rounded-full py-0 pl-1.5 pr-3 text-[11px] font-bold uppercase tracking-[1px]">
      {PERK_EMBLEM[tier] && <img src={PERK_EMBLEM[tier]} alt="" aria-hidden="true" width={34} height={34} className="relative z-[1] -my-[4px] -ml-1 size-[34px] object-contain drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]" />}
      {name}
    </span>
  )
}

export type PerkLook = { tier: string; name: string }

/** Each tier's own shine for React Bits' Shiny Text (the colours come from the owner's art, so they are palette-exempt): silver, violet with gold, gold with red. */
const SHINE: Record<string, { color: string; shine: string; glow: string }> = {
  tier1: { color: "#a1a1aa", shine: "#ffffff", glow: "#e5e5e5" }, // palette-exempt: Prestige silver
  tier2: { color: "#b69cf7", shine: "#f2cd72", glow: "#8b5cf6" }, // palette-exempt: Imperial violet and gold
  tier3: { color: "#e2b04a", shine: "#ff6b6b", glow: "#dc2626" }, // palette-exempt: Eternal gold and red
  tier4: { color: "#c98a63", shine: "#f3d2bb", glow: "#b7673c" }, // palette-exempt: Prime copper
  tier5: { color: "#cfe0f5", shine: "#ffffff", glow: "#8fb4e8" }, // palette-exempt: Sovereign diamond
}

/**
 * A paid rank's mark next to a player's name in lists (owner request 2026-11-07: everywhere the name is, shining, each rank in its own colour): the tier's
 * emblem with a glow of its colour and, unless `compact`, the rank's name in React Bits' Shiny Text with the tier's own shine. Nothing renders without a rank.
 */
export function PerkMark({ perk, compact = false, size = 20 }: { perk?: PerkLook | null; compact?: boolean; size?: number }) {
  if (!perk || !PERK_EMBLEM[perk.tier]) return null
  const tone = SHINE[perk.tier] ?? SHINE.tier1
  return (
    <span title={`${perk.name}: a LEGACY-X in-game rank`} data-tier={perk.tier} className="inline-flex shrink-0 items-center gap-1 align-middle">
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
