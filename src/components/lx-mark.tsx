import coin from "@/assets/fol/coin.webp"
import coinSmall from "@/assets/fol/coin-small.webp"

/** The FOL$ coin (owner's art, 2026-11-17): the plain coin up to 24px, where the detail would blur, the detailed one above. Decorative: the amount beside it says what it is. */
export function LxMark({ size = 20, className }: { size?: number; className?: string }) {
  const px = Math.max(12, Math.round(size * 1.15))
  return <img src={px <= 24 ? coinSmall : coin} alt="" aria-hidden="true" draggable={false} width={px} height={px} className={["lx-mark inline-block shrink-0 align-[-0.2em]", className].filter(Boolean).join(" ")} />
}
