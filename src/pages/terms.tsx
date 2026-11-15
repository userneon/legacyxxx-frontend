import type { ReactNode } from "react"

import { LINKS } from "@/lib/links"

/**
 * The terms of service (owner request 2026-11-15; TikTok for Developers asks for an address for it). Plain words about using the site, the servers and the app.
 * Written next to the privacy policy (privacy.tsx); when a rule here changes, change this page in the same commit.
 */
const section = "flex flex-col gap-2"
const heading = "text-[15px] font-semibold text-[var(--text)]"
const body = "text-[13px] leading-relaxed text-[var(--text-muted)]"

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={section}>
      <h2 className={heading}>{title}</h2>
      <div className={`${body} flex flex-col gap-2`}>{children}</div>
    </section>
  )
}

export function TermsPage() {
  return (
    <article className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-6 pb-16 pt-8 max-md:px-4">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[28px] leading-tight text-[var(--text)]">Terms of service</h1>
        <p className={body}>LXC is a community for Counter-Strike 2 players in Mongolia: the website, the iPhone app, the game servers and the Discord server. By signing in or playing on our servers you agree to these terms.</p>
      </header>

      <Part title="Your account">
        <p>You sign in with Steam. The account is yours and you are responsible for what is done with it. One person, one account: sharing or selling an account, or opening another one to avoid a penalty, is not allowed.</p>
      </Part>

      <Part title="Fair play and behaviour">
        <p>No cheats, scripts that give an unfair advantage, exploits of game or server bugs, ban evasion, or match fixing. Be respectful: no harassment, threats, hate speech or spam in game chat, voice, the website, Discord or the market. Staff may warn, mute, gag, ban or remove content, and a penalty stays on record even if the account is deleted.</p>
      </Part>

      <Part title="FOL$, LX and cosmetics">
        <p>FOL$ and LX are community balances for the Shop, ranks and cosmetics. They are not money, cannot be withdrawn, and have no value outside LXC. A purchase or top-up is final unless staff decide otherwise; a cosmetic is a licence to wear it on our servers and may be changed or removed if it breaks a rule or the game changes.</p>
      </Part>

      <Part title="Market and content you post">
        <p>Market listings, reviews, clan pages and chat are written by players. You are responsible for what you post and must have the right to share it. Do not post anything illegal, misleading or someone else's private information. Staff may remove content and the people who posted it may be penalised.</p>
      </Part>

      <Part title="Content creators and TikTok">
        <p>A creator may connect a TikTok account with TikTok's own sign-in so that the creator's @handle and public counts are shown on the Creators page. You can disconnect it at any time. How we handle that data is described in the <a className="text-[var(--text)] underline" href="/privacy">privacy policy</a>.</p>
      </Part>

      <Part title="The service">
        <p>The servers, the website and the app are provided as they are. They can be down, changed or ended, and ranks, stats and balances can be corrected or reset when needed (for example after a bug or a cheater). We are not responsible for losses caused by that. Counter-Strike 2, Steam and TikTok belong to their owners and are not run by LXC.</p>
      </Part>

      <Part title="Changes and contact">
        <p>We may change these terms; the page shows the current ones and continuing to play or sign in means you accept them. Questions or requests: write to LXC staff on <a className="text-[var(--text)] underline" href={LINKS.discordInvite} target="_blank" rel="noreferrer">our Discord</a>.</p>
      </Part>
    </article>
  )
}
