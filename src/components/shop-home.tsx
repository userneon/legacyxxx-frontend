import coins from "@/assets/shop3d/coins.png"
import crown from "@/assets/shop3d/crown.png"
import effects from "@/assets/shop3d/effects.png"
import medal from "@/assets/shop3d/medal.png"
import models from "@/assets/shop3d/models.png"
import { cn } from "@/lib/utils"

export type ShopTarget = "ranks" | "model" | "smoke_color" | "discord_role" | "topup"

const BLUE = "#3d63ff"
const GOLD = "#f6c945"

type Card = { target: ShopTarget; title: string; lead: string; checks: [string, string]; cta: string; art: string; tone: "blue" | "gold" | "plain"; screen?: boolean; chip?: string }

/**
 * The Shop's front door (owner's design, 2026-11-16): one card per thing the Shop sells. Each card has a small picture badge, a title, one line, two short facts and an outline button.
 * The corner light is the card's own colour (gold for paid status, blue for looks), and on hover the card's picture appears large and faint on the right. Nothing here is priced or sold on its own.
 * Pictures: LXC's own AI-generated art (owner, 2026-11-16); the button's money icon is 3dicons.co (CC0).
 */
const CARDS: Card[] = [
  { target: "ranks", title: "Ranks", lead: "Five tiers. Your name, emblem and commands on every server.", checks: ["Name and emblem on every server", "Commands unlock with each tier"], cta: "Open ranks", art: medal, tone: "gold" },
  { target: "model", title: "Custom Models", lead: "Knives, weapons and agents made for LXC.", checks: ["CT and T apply automatically", "Knives, weapons and agents"], cta: "Open models", art: models, tone: "blue" },
  { target: "smoke_color", title: "Effects", lead: "Grenade trails, smoke colours and flash looks.", checks: ["Pick a colour for each effect", "Seen by every player"], cta: "Open effects", art: effects, tone: "blue", screen: true },
  { target: "discord_role", title: "Roles", lead: "Supporter and up: a colour, a channel and a discount.", checks: ["A role colour in Discord", "A supporter channel and a discount"], cta: "Open roles", art: crown, tone: "gold" },
  { target: "topup", title: "Top up FOL$", lead: "Pay with QPay or any bank app. Cosmetics only.", checks: ["QPay or any bank app", "FOL$ is for cosmetics only"], cta: "Top up", art: coins, tone: "plain" },
]

const tint = (tone: Card["tone"]) => (tone === "gold" ? GOLD : tone === "blue" ? BLUE : "#ffffff")

export function ShopHome({ onGo, className }: { onGo: (target: ShopTarget) => void; className?: string }) {
  return (
    <section aria-label="Shop" className={cn("flex min-w-0 flex-col gap-5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex max-w-[36rem] flex-col gap-1.5">
          <h2 className="text-[26px] font-bold leading-[1.1] text-[var(--text)] text-balance">Look the part on every server</h2>
          <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">Ranks, custom models, effects and roles. Cosmetics only: nothing here changes how a round is played.</p>
        </div>
        <button type="button" onClick={() => onGo("topup")} className="lx-gold-button lx-gold-crown lx-gold-money inline-flex h-11 items-center rounded-xl pr-6 text-[13px]">Top up FOL$</button>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <li key={card.target} className="flex min-w-0">
            <button
              type="button"
              onClick={() => onGo(card.target)}
              className="group relative flex min-h-[212px] w-full flex-col overflow-hidden rounded-[20px] border border-white/[0.07] bg-[linear-gradient(165deg,#111218,#08090c_75%)] p-5 text-left transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-[3px] hover:border-white/[0.28] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-90 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `radial-gradient(130% 70% at 50% 135%, ${tint(card.tone)}99, transparent 68%)` }} />
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${tint(card.tone)}99, transparent)` }} />
              <img src={card.art} alt="" aria-hidden="true" draggable={false} className={cn("pointer-events-none absolute -right-[30px] top-[6px] h-[230px] w-auto opacity-0 transition-opacity duration-300 [mask-image:linear-gradient(270deg,#000_15%,transparent_85%)] group-hover:opacity-50 motion-reduce:transition-none", card.screen && "mix-blend-screen")} />
              <span className="relative text-[20px] font-semibold leading-tight text-[var(--text)]">{card.title}</span>
              <span className="relative mt-1 max-w-[300px] text-[13.5px] leading-relaxed text-[var(--text-dim)]">{card.lead}</span>
              <span className="relative mb-4 mt-3 flex flex-col gap-1.5">
                {card.checks.map((text) => (
                  <span key={text} className="flex items-center gap-2.5 text-[13px] text-[#aab0c2]">
                    <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center rounded-full border border-white/30 text-[9px]">{"✓"}</span>
                    {text}
                  </span>
                ))}
              </span>
              <span className="relative mt-auto grid h-10 place-items-center rounded-[10px] border border-white/30 text-[14px] font-semibold text-[var(--text)] transition-colors duration-300 group-hover:border-white/70 group-hover:bg-white/[0.06]">
                {card.cta}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <details className="text-[11px] text-[var(--text-dim)]">
        <summary className="w-fit cursor-pointer">Picture credits</summary>
        <p className="mt-1.5 max-w-[60ch] leading-relaxed">
          Card pictures are LXC's own artwork. The money icon on the Top up button is from <a className="underline" href="https://3dicons.co" target="_blank" rel="noopener noreferrer">3dicons.co</a> (CC0).
        </p>
      </details>
    </section>
  )
}
