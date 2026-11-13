import type { ReactNode } from "react"

import { LINKS } from "@/lib/links"

/**
 * The privacy policy (owner request 2026-11-08; the App Store wants an address for it). Plain words about what the site and the app keep.
 * It describes what the code does today; when a feature changes what is kept, change this page in the same commit.
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

export function PrivacyPage() {
  return (
    <article className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-6 pb-16 pt-8 max-md:px-4">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[28px] leading-tight text-[var(--text)]">Privacy policy</h1>
        <p className={body}>LEGACY-X is a community for Counter-Strike 2 players in Mongolia: the website at legacyx.cc, the iPhone app, the game servers and the Discord server. This page says what they keep about you and why.</p>
      </header>

      <Part title="What we keep">
        <p><b className="text-[var(--text)]">Your account.</b> When you sign in with Steam we receive your SteamID64, your Steam name and your avatar. We never receive your Steam password: Steam asks for it on steamcommunity.com.</p>
        <p><b className="text-[var(--text)]">Your play.</b> Matches on our servers (score, kills, deaths, damage, rank and EXP changes), your penalties (bans, mutes, gags) with the reason and who gave them, and the IP address and connection details of a game session, which our servers use to protect against cheating and ban evasion.</p>
        <p><b className="text-[var(--text)]">What you set up.</b> Your skins, cosmetics, clan, reviews, market listings (with the phone number and e-mail you chose to put on them), chat messages, your Configs tab, and your FOL$ wallet and its history.</p>
        <p><b className="text-[var(--text)]">Payments.</b> A top-up or a paid rank is paid on the page of our payment provider (Wire, with QPay and the banks). We keep the amount, the time and the result. We never see your card or bank login.</p>
        <p><b className="text-[var(--text)]">Your phone (iPhone app).</b> If you allow notifications, a push token that Apple gives the app, so we can send you the same messages as the bell on the website. Your choice of language and the player you follow stay on your phone.</p>
        <p><b className="text-[var(--text)]">TikTok (content creators only).</b> If you are a content creator and connect your TikTok with TikTok's own sign-in, we keep your TikTok account id, your @handle, display name and picture, and the follower, like and video counts TikTok gave us at that moment. We never keep TikTok's access token and never post for you. You can disconnect it on the Creators page and it is deleted.</p>
        <p><b className="text-[var(--text)]">Staff checks.</b> If staff ask you to run the LEGACY-X Checker, it reads the programs and files described to you on its first screen and sends the result to staff. It changes nothing on your computer. The result is kept for a limited time.</p>
      </Part>

      <Part title="Why">
        <p>To run the ladder and the servers, to keep the game fair (anti-cheat, penalties), to let you buy and wear cosmetics, to send you the messages you asked for, and to answer you when you write to us. We do not sell your data, we do not show ads, and we do not track you across other sites or apps.</p>
      </Part>

      <Part title="Who sees it">
        <p>Your name, avatar, rank, stats, clan, reviews and penalties are public on the website: that is what a ladder is. Staff see more (IP addresses, checks, the log of what staff did). Your market phone number and e-mail are shown only to signed-in players who press the button for them. Hidden stats stay hidden when you hide them in Settings.</p>
        <p>We use these services to run the platform: Steam (sign-in), Supabase (our database), Wire (payments), Apple (push notifications), Discord (our community server and its bot), TikTok (only for creators who connect it) and our own game servers and web servers.</p>
      </Part>

      <Part title="How long">
        <p>Match history and the ladder are kept as long as the community runs. Public chat messages and finished Checker results are kept for the time staff set in the site's settings, then removed. A ban or a penalty stays on record even if the account is deleted, so that a ban cannot be wiped by deleting the account.</p>
      </Part>

      <Part title="Your choices">
        <p><b className="text-[var(--text)]">Delete your account.</b> In the iPhone app: Settings → Delete my account. On the website: write to staff on <a className="text-[var(--text)] underline" href={LINKS.discordInvite} target="_blank" rel="noreferrer">our Discord</a>. Staff check the request and delete the account; a ban or penalty record stays.</p>
        <p><b className="text-[var(--text)]">Notifications.</b> Switch them off in iOS Settings at any time; the app stops receiving them.</p>
        <p><b className="text-[var(--text)]">Ask what we keep.</b> Write to staff on Discord and we will tell you, and correct what is wrong.</p>
      </Part>

      <Part title="Changes and contact">
        <p>We change this page when what we keep changes. For anything about your data, contact LEGACY-X staff on our Discord server.</p>
      </Part>
    </article>
  )
}
