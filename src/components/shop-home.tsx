import wallet from "@/assets/shop3d/wallet.png"
import crown from "@/assets/shop3d/crown.png"
import star from "@/assets/shop3d/star.png"
import medal from "@/assets/shop3d/medal.png"
import knife from "@/assets/shop3d/cs2-knife.png"
import rifle from "@/assets/shop3d/cs2-rifle.png"
import agent from "@/assets/shop3d/cs2-agent.png"
import { cn } from "@/lib/utils"

export type ShopTarget = "ranks" | "model" | "smoke_color" | "discord_role" | "topup"

/** One indigo light for every card (owner request 2026-11-15, "put it in the Shop in exactly this style"); palette-exempt: it is the picture's light, not an interface colour. */
const LIGHT = "#6f7dff"

/**
 * The Shop's front door: a short header and one card per thing the Shop sells. Each card is a real 3D picture standing on three isometric glass plates over one soft light;
 * hovering lifts the picture and spreads the plates. Every card opens something the Shop already sells; nothing here is priced or sold on its own.
 * Pictures: 3dicons.co (CC0); the Custom Models card shows CS2 items from Valve's own game art (via ByMykel CS2 API).
 */
const CARDS: Array<{ target: ShopTarget; title: string; text: string; art: "medal" | "models" | "star" | "crown" | "wallet" }> = [
  { target: "ranks", title: "Ranks", text: "Five tiers. Your name, emblem and commands on every server.", art: "medal" },
  { target: "model", title: "Custom Models", text: "Knives, weapons and agents made for LXC.", art: "models" },
  { target: "smoke_color", title: "Effects", text: "Grenade trails, smoke colours and flash looks.", art: "star" },
  { target: "discord_role", title: "Roles", text: "Supporter and up: a colour, a channel and a discount.", art: "crown" },
  { target: "topup", title: "Top up FOL$", text: "Pay with QPay or any bank app. Cosmetics only.", art: "wallet" },
]

function Plates() {
  return (
    <div aria-hidden="true" className="absolute left-1/2 top-[64%] size-0 [perspective:900px] [transform-style:preserve-3d]">
      {[{ z: 0, o: 0.55 }, { z: 10, o: 0.8 }, { z: 20, o: 1 }].map((plate, i) => (
        <span
          key={plate.z}
          className={cn("absolute -left-[70px] -top-[70px] size-[140px] rounded-[24px] border transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none", i === 1 && "group-hover:[--lift:12px]", i === 2 && "group-hover:[--lift:24px]")}
          style={{ ["--lift" as string]: "0px", opacity: plate.o, borderColor: `${LIGHT}66`, background: `linear-gradient(135deg, ${LIGHT}1c, transparent)`, boxShadow: `inset 0 0 24px ${LIGHT}22`, transform: `rotateX(62deg) rotateZ(-45deg) translateZ(calc(${plate.z}px + var(--lift)))` }}
        />
      ))}
    </div>
  )
}

function Picture({ art }: { art: (typeof CARDS)[number]["art"] }) {
  const lift = "transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:-translate-y-2 motion-reduce:transition-none"
  const shadow = "pointer-events-none absolute drop-shadow-[0_18px_18px_rgba(0,0,0,0.65)]"
  if (art === "models") {
    return (
      <>
        <img src={knife} alt="" aria-hidden="true" draggable={false} className={cn(shadow, lift, "left-[6%] top-[14%] h-[66px]")} />
        <img src={rifle} alt="" aria-hidden="true" draggable={false} className={cn(shadow, lift, "left-[5%] top-[50%] h-[54px]")} />
        <img src={agent} alt="" aria-hidden="true" draggable={false} className={cn(shadow, lift, "left-[50%] top-[10%] h-[106px]")} />
      </>
    )
  }
  const image = art === "star" ? star : art === "crown" ? crown : art === "medal" ? medal : wallet
  return <img src={image} alt="" aria-hidden="true" draggable={false} className={cn(shadow, lift, "left-1/2 top-[12%] h-[116px] -translate-x-1/2")} />
}

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
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {CARDS.map((card) => (
          <li key={card.target} className="flex min-w-0">
            <button
              type="button"
              onClick={() => onGo(card.target)}
              className="group relative flex h-full w-full flex-col overflow-hidden rounded-[22px] border border-white/[0.06] bg-[linear-gradient(180deg,#141416,#0d0d0f)] text-left transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-white/[0.14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
            >
              <div className="relative h-[196px] overflow-hidden [mask-image:linear-gradient(180deg,#000_58%,transparent_96%)]">
                <span aria-hidden="true" className="absolute -bottom-8 left-1/2 h-[130px] w-[80%] -translate-x-1/2 rounded-full opacity-60 blur-[30px] transition-[opacity,transform] duration-300 group-hover:scale-110 group-hover:opacity-100 motion-reduce:transition-none" style={{ background: `radial-gradient(closest-side, ${LIGHT}88, transparent)` }} />
                <Plates />
                <Picture art={card.art} />
              </div>
              <div className="relative -mt-3 flex flex-1 flex-col gap-2 px-5 pb-5 pt-3">
                <span className="text-[17px] font-semibold leading-tight text-[var(--text)]">{card.title.split(" ")[0]}{card.title.includes(" ") ? <span className="text-[var(--text-dim)]"> {card.title.split(" ").slice(1).join(" ")}</span> : null}</span>
                <span className="max-w-[34ch] text-[13.5px] leading-relaxed text-[var(--text-dim)]">{card.text}</span>
                <span className="mt-auto inline-flex pt-2 items-center gap-1.5 text-[13px] font-semibold" style={{ color: "#aeb6ff" }}>Open<span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none">→</span></span>
              </div>
            </button>
          </li>
        ))}
      </ul>
      <details className="text-[11px] text-[var(--text-dim)]">
        <summary className="w-fit cursor-pointer">Picture credits</summary>
        <p className="mt-1.5 max-w-[60ch] leading-relaxed">
          3D icons from <a className="underline" href="https://3dicons.co" target="_blank" rel="noopener noreferrer">3dicons.co</a> (CC0). Counter-Strike 2 items on the Custom Models card are Valve's artwork, listed through the open <a className="underline" href="https://github.com/ByMykel/CSGO-API" target="_blank" rel="noopener noreferrer">CS2 API</a>; LXC is not affiliated with Valve.
        </p>
      </details>
    </section>
  )
}
