import { cn } from "@/lib/utils"

const HEX = /^#[0-9a-f]{6}$/i

/**
 * A smoke grenade's cloud in the colour a player picked: a few soft overlapping puffs, drawn with gradients so it stays
 * sharp at any size. With a second colour the cloud turns from one to the other and gets a soft halo of light. The colours are
 * plain #rrggbb from the API (never a style string).
 */
export function SmokePuff({ color, color2, className }: { color?: string | null; color2?: string | null; className?: string }) {
  const first = color && HEX.test(color) ? color : "#a3a3a3"
  const second = color2 && HEX.test(color2) ? color2 : null
  // Each puff fades to nothing well inside the box, so no edge of it is ever cut off.
  const puff = (tint: string, x: string, y: string, rx: string, ry: string, alpha: string) => `radial-gradient(ellipse ${rx} ${ry} at ${x} ${y}, ${tint}${alpha} 0%, ${tint}00 100%)`
  const layers = [
    puff(first, "28%", "58%", "24%", "36%", "cc"),
    puff(first, "50%", "40%", "26%", "38%", "dd"),
    puff(second ?? first, "72%", "60%", "22%", "34%", "bb"),
    puff(second ?? first, "48%", "68%", "22%", "26%", "99"),
  ]
  // The halo of a two-colour smoke: a wide, faint light in each colour behind the cloud.
  if (second) layers.unshift(puff(first, "32%", "50%", "30%", "46%", "44"), puff(second, "68%", "50%", "30%", "46%", "44"))
  return <span aria-hidden="true" className={cn("block aspect-[5/3] w-full max-w-[220px]", className)} style={{ backgroundImage: layers.join(", ") }} />
}
