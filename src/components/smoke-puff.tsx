import { cn } from "@/lib/utils"

/**
 * A smoke grenade's cloud in the colour a player picked: a few soft overlapping puffs, drawn with gradients so it stays
 * sharp at any size. The colour is a plain #rrggbb from the API (never a style string).
 */
export function SmokePuff({ color, className }: { color?: string | null; className?: string }) {
  const tint = color && /^#[0-9a-f]{6}$/i.test(color) ? color : "#a3a3a3"
  // Each puff fades to nothing well inside the box, so no edge of it is ever cut off.
  const puff = (x: string, y: string, rx: string, ry: string, alpha: string) => `radial-gradient(ellipse ${rx} ${ry} at ${x} ${y}, ${tint}${alpha} 0%, ${tint}00 100%)`
  return (
    <span
      aria-hidden="true"
      className={cn("block aspect-[5/3] w-full max-w-[220px]", className)}
      style={{ backgroundImage: [puff("28%", "58%", "24%", "36%", "cc"), puff("50%", "40%", "26%", "38%", "dd"), puff("72%", "60%", "22%", "34%", "bb"), puff("48%", "68%", "22%", "26%", "99")].join(", ") }}
    />
  )
}
