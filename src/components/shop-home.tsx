import cube from "@/assets/shop3d/cube.png"
import star from "@/assets/shop3d/star.png"
import coin from "@/assets/shop3d/3d-coin.png"
import crown from "@/assets/shop3d/crown.png"
import sovereign from "@/assets/ranks/art-sovereign.webp"
import imperialMark from "@/assets/ranks/mark-imperial.webp"
import { cn } from "@/lib/utils"

export type ShopTarget = "ranks" | "model" | "smoke_color" | "discord_role" | "topup"

/**
 * The Shop's front door (owner request 2026-11-15, "make the Shop look like a real store"): a banner and one row of category tiles, each with a real 3D picture
 * (3dicons.co, CC0) over its own tint. Every tile opens something the Shop already sells; nothing here is sold or priced on its own.
 * Credits: see public/credits (3dicons.co CC0).
 */
const TILES: Array<{ target: ShopTarget; title: string; sub: string; image: string; tint: string; tag?: string }> = [
  { target: "ranks", title: "Ranks", sub: "5 tiers", image: imperialMark, tint: "#a855f7" },
  { target: "model", title: "Custom Models", sub: "Knives, weapons, agents", image: cube, tint: "#06b6d4", tag: "NEW" },
  { target: "smoke_color", title: "Effects", sub: "Trails, smoke, flash", image: star, tint: "#ec4899" },
  { target: "discord_role", title: "Roles", sub: "Supporter and up", image: crown, tint: "#f59e0b" },
  { target: "topup", title: "Top up LX", sub: "QPay or bank app", image: coin, tint: "#eab308" },
]

export function ShopHome({ onGo, className }: { onGo: (target: ShopTarget) => void; className?: string }) {
  return (
    <section aria-label="Shop" className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div className="relative isolate flex min-h-[188px] items-center overflow-hidden rounded-[22px] border border-[var(--line)] bg-[radial-gradient(520px_220px_at_88%_0%,rgba(139,92,246,0.22),transparent_70%),var(--card-surface,var(--raised))] px-6 py-6 sm:px-8">
        <div className="relative z-[1] flex max-w-[30rem] flex-col items-start gap-2.5">
          <span className="rounded-full bg-[var(--brand)]/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--brand-bright)]">LXC Shop</span>
          <h2 className="text-[26px] font-bold leading-[1.1] text-[var(--text)] text-balance sm:text-[32px]">Look the part on every server</h2>
          <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">Ranks, custom models, effects and roles. Cosmetics only: nothing here changes how a round is played.</p>
          <button type="button" onClick={() => onGo("topup")} className="lx-primary-button mt-1 inline-flex h-10 items-center rounded-xl px-5 text-[13px] font-semibold">Top up LX</button>
        </div>
        <img src={sovereign} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute bottom-2 right-6 z-0 h-[92%] max-h-[250px] object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.6)] max-sm:right-0 max-sm:opacity-40" />
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TILES.map((tile) => (
          <li key={tile.target} className="min-w-0">
            <button
              type="button"
              onClick={() => onGo(tile.target)}
              style={{ "--tint": tile.tint } as React.CSSProperties}
              className="group relative flex h-[136px] w-full flex-col justify-end overflow-hidden rounded-[20px] border border-[color-mix(in_srgb,var(--tint)_45%,transparent)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--tint)_30%,#0a0a0a),color-mix(in_srgb,var(--tint)_6%,#0a0a0a))] p-3.5 text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_color-mix(in_srgb,var(--tint)_30%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
            >
              {tile.tag && <span className="absolute left-3 top-2.5 rounded-full bg-[#ff6a3d] px-2 py-0.5 text-[9px] font-bold tracking-[0.06em] text-[#1c0a04]">{tile.tag}</span>}
              <img src={tile.image} alt="" aria-hidden="true" draggable={false} width={96} height={96} className="pointer-events-none absolute -right-1 -top-1 size-[92px] object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] transition-transform duration-200 group-hover:rotate-[-4deg] group-hover:scale-110 motion-reduce:transition-none" />
              <span className="relative text-[14px] font-bold leading-tight text-[var(--text)]">{tile.title}</span>
              <span className="relative text-[11px] leading-snug text-[#cbd5e1]">{tile.sub}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
