/**
 * The text of the Terms of service and the Privacy policy, in one place (owner request 2026-11-18: AI and search crawlers must be able to read both pages).
 * The React pages (pages/terms.tsx, pages/privacy.tsx) draw from it, and so does the build step (legal-static-plugin.ts) that writes plain HTML and Markdown
 * copies into dist/ for readers that do not run JavaScript. Keep this file free of imports so the build step can load it. When a rule changes, change it here.
 */
export type LegalPart = string | { b: string } | { a: string; href: "discord" | "privacy" | "terms" }
export type LegalParagraph = LegalPart[]
export type LegalSection = { title: string; paragraphs: LegalParagraph[] }
export type LegalDoc = { slug: "terms" | "privacy"; title: string; description: string; intro: LegalPart[]; sections: LegalSection[] }

/** The intro of the privacy policy names the site; `{site}` is replaced with the host of the build. */
export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "terms",
    title: "Terms of service",
    description: "The rules for using LXC, the Counter-Strike 2 community in Mongolia: accounts, fair play, FOL$ and LX, the market, content creators and the service.",
    intro: ["LXC is a community for Counter-Strike 2 players in Mongolia: the website, the iPhone app, the game servers and the Discord server. By signing in or playing on our servers you agree to these terms."],
    sections: [
      { title: "Your account", paragraphs: [["You sign in with Steam. The account is yours and you are responsible for what is done with it. One person, one account: sharing or selling an account, or opening another one to avoid a penalty, is not allowed."]] },
      { title: "Fair play and behaviour", paragraphs: [["No cheats, scripts that give an unfair advantage, exploits of game or server bugs, ban evasion, or match fixing. Be respectful: no harassment, threats, hate speech or spam in game chat, voice, the website, Discord or the market. Staff may warn, mute, gag, ban or remove content, and a penalty stays on record even if the account is deleted."]] },
      { title: "FOL$, LX and cosmetics", paragraphs: [["FOL$ and LX are community balances for the Shop, ranks and cosmetics. They are not money, cannot be withdrawn, and have no value outside LXC. A purchase or top-up is final unless staff decide otherwise; a cosmetic is a licence to wear it on our servers and may be changed or removed if it breaks a rule or the game changes."]] },
      { title: "Market and content you post", paragraphs: [["Market listings, reviews, clan pages and chat are written by players. You are responsible for what you post and must have the right to share it. Do not post anything illegal, misleading or someone else's private information. Staff may remove content and the people who posted it may be penalised."]] },
      { title: "Content creators and TikTok", paragraphs: [["A creator may connect a TikTok account with TikTok's own sign-in so that the creator's @handle and public counts are shown on the Creators page. You can disconnect it at any time. How we handle that data is described in the ", { a: "privacy policy", href: "privacy" }, "."]] },
      { title: "The service", paragraphs: [["The servers, the website and the app are provided as they are. They can be down, changed or ended, and ranks, stats and balances can be corrected or reset when needed (for example after a bug or a cheater). We are not responsible for losses caused by that. Counter-Strike 2, Steam and TikTok belong to their owners and are not run by LXC."]] },
      { title: "Changes and contact", paragraphs: [["We may change these terms; the page shows the current ones and continuing to play or sign in means you accept them. Questions or requests: write to LXC staff on ", { a: "our Discord", href: "discord" }, "."]] },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy policy",
    description: "What LXC, the Counter-Strike 2 community in Mongolia, keeps about you and why: account, play, payments, the iPhone app, TikTok for creators, who sees it, how long, and your choices.",
    intro: ["LXC is a community for Counter-Strike 2 players in Mongolia: the website at {site}, the iPhone app, the game servers and the Discord server. This page says what they keep about you and why."],
    sections: [
      {
        title: "What we keep",
        paragraphs: [
          [{ b: "Your account." }, " When you sign in with Steam we receive your SteamID64, your Steam name and your avatar. We never receive your Steam password: Steam asks for it on steamcommunity.com."],
          [{ b: "Your play." }, " Matches on our servers (score, kills, deaths, damage, rank and EXP changes), your penalties (bans, mutes, gags) with the reason and who gave them, and the IP address and connection details of a game session, which our servers use to protect against cheating and ban evasion."],
          [{ b: "What you set up." }, " Your skins, cosmetics, clan, reviews, market listings (with the phone number and e-mail you chose to put on them), chat messages, your Configs tab, and your FOL$ wallet and its history."],
          [{ b: "Payments." }, " A top-up or a paid rank is paid on the page of our payment provider (Wire, with QPay and the banks). We keep the amount, the time and the result. We never see your card or bank login."],
          [{ b: "Your phone (iPhone app)." }, " If you allow notifications, a push token that Apple gives the app, so we can send you the same messages as the bell on the website. Your choice of language and the player you follow stay on your phone."],
          [{ b: "TikTok (content creators only)." }, " If you are a content creator and connect your TikTok with TikTok's own sign-in, we keep your TikTok account id, your @handle, display name and picture, and the follower, like and video counts TikTok gave us at that moment. We never keep TikTok's access token and never post for you. You can disconnect it on the Creators page and it is deleted."],
          [{ b: "Staff checks." }, " If staff ask you to run the LXC Checker, it reads the programs and files described to you on its first screen and sends the result to staff. It changes nothing on your computer. The result is kept for a limited time."],
        ],
      },
      { title: "Why", paragraphs: [["To run the ladder and the servers, to keep the game fair (anti-cheat, penalties), to let you buy and wear cosmetics, to send you the messages you asked for, and to answer you when you write to us. We do not sell your data, we do not show ads, and we do not track you across other sites or apps."]] },
      {
        title: "Who sees it",
        paragraphs: [
          ["Your name, avatar, rank, stats, clan, reviews and penalties are public on the website: that is what a ladder is. Staff see more (IP addresses, checks, the log of what staff did). Your market phone number and e-mail are shown only to signed-in players who press the button for them. Hidden stats stay hidden when you hide them in Settings."],
          ["We use these services to run the platform: Steam (sign-in), Supabase (our database), Wire (payments), Apple (push notifications), Discord (our community server and its bot), TikTok (only for creators who connect it) and our own game servers and web servers."],
        ],
      },
      { title: "How long", paragraphs: [["Match history and the ladder are kept as long as the community runs. Public chat messages and finished Checker results are kept for the time staff set in the site's settings, then removed. A ban or a penalty stays on record even if the account is deleted, so that a ban cannot be wiped by deleting the account."]] },
      {
        title: "Your choices",
        paragraphs: [
          [{ b: "Delete your account." }, " In the iPhone app: Settings → Delete my account. On the website: write to staff on ", { a: "our Discord", href: "discord" }, ". Staff check the request and delete the account; a ban or penalty record stays."],
          [{ b: "Notifications." }, " Switch them off in iOS Settings at any time; the app stops receiving them."],
          [{ b: "Ask what we keep." }, " Write to staff on Discord and we will tell you, and correct what is wrong."],
        ],
      },
      { title: "Changes and contact", paragraphs: [["We change this page when what we keep changes. For anything about your data, contact LXC staff on our Discord server."]] },
    ],
  },
]

export const legalDoc = (slug: LegalDoc["slug"]) => LEGAL_DOCS.find((doc) => doc.slug === slug)!
