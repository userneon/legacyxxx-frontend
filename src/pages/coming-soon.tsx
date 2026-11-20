import { Check } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { discordService, type DiscordLinkState } from "@/api/discord"
import { DiscordIcon } from "@/components/discord-strip"
import { SteamIcon } from "@/components/steam-login-gate"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"

import { SiteLogo } from "@/components/site-logo"
import { LAUNCH_AT, timeLeft } from "@/lib/coming-soon"
import { LINKS } from "@/lib/links"

function Step({ icon, done, title, text, children }: { icon: ReactNode; done: boolean; title: string; text: string; children?: ReactNode }) {
  return (
    <li className="flex items-center gap-3.5 text-left">
      <span aria-hidden="true" className={`relative grid size-9 shrink-0 place-items-center ${done ? "text-[var(--text)]" : "text-[var(--text-dim)]"}`}>
        {icon}
        {done && <span className="absolute -bottom-0.5 -right-1 grid size-4 place-items-center rounded-full bg-[var(--status-green)] text-black"><Check className="size-3" strokeWidth={3.5} /></span>}
      </span>
      <span className="flex min-w-0 flex-1 flex-col"><span className="text-[14px] font-semibold text-[var(--text)]">{title}</span><span className="truncate text-[12px] text-[var(--text-dim)]">{text}</span></span>
      {children}
    </li>
  )
}

/**
 * Early connect (owner request 2026-11-20): before the launch a visitor connects Steam, and then Discord. Every address is this page while the site is coming soon, so the return from Steam
 * (?access_token or a cookie) and from Discord (/settings?discord=linked) land here too, and nobody is sent to a page that is not open.
 */
function EarlyConnect() {
  const { user, isAuthenticated, loading, loginWithSteam } = useAuth()
  const [params, setParams] = useSearchParams()
  const link = useApiQuery<DiscordLinkState>((signal) => discordService.getLink({ signal }), { enabled: isAuthenticated, queryKey: "soon-discord-link" })
  const [busy, setBusy] = useState(false)

  // Back from Discord's consent page: say how it went and drop the parameter.
  useEffect(() => {
    const result = params.get("discord")
    if (!result) return
    const next = new URLSearchParams(params)
    next.delete("discord")
    setParams(next, { replace: true })
    if (result === "linked") { toast.success("Discord connected"); link.refetch() }
    else toast.error("Discord was not connected", { description: "Try again in a moment." })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connectDiscord = async () => {
    setBusy(true)
    try {
      const { url } = await discordService.start()
      window.location.assign(url)
    } catch {
      toast.error("Could not start the Discord link", { description: "Try again in a moment." })
      setBusy(false)
    }
  }

  const button = "inline-flex h-9 shrink-0 items-center rounded-lg border border-[var(--line-strong)] bg-[var(--raised)] px-4 text-[13px] font-semibold text-[var(--text)] transition-colors hover:bg-[var(--card-surface)] disabled:opacity-50"
  const discord = link.data
  const linked = Boolean(discord?.link)
  if (isAuthenticated && linked) {
    return (
      <section aria-label="Connected" className="flex w-full max-w-[460px] flex-col items-center gap-2 py-2 text-center">
        <p className="lx-shiny-text text-[clamp(22px,4.5vw,30px)] font-bold leading-tight">Thanks for connecting early!</p>
        <p className="text-[13px] leading-relaxed text-[var(--text-dim)]">{user?.username ? `${user.username}, you` : "You"} are all set. See you on 12 December.</p>
        <span className="mt-1 flex items-center gap-3 text-[var(--text-dim)]"><SteamIcon className="size-5" /><Check className="size-4 text-[var(--status-green)]" strokeWidth={3} aria-hidden="true" /><DiscordIcon className="size-5" /></span>
        {discord?.link?.inServer === false && <a href={LINKS.discordInvite} target="_blank" rel="noreferrer" className="lx-discord-btn mt-2 inline-flex h-10 items-center gap-2 rounded-lg px-5 text-[13px] font-semibold transition-colors"><DiscordIcon className="size-5" />Join the server</a>}
      </section>
    )
  }
  return (
    <section aria-label="Connect early" className="flex w-full max-w-[460px] flex-col gap-4 rounded-2xl border border-[var(--line)] bg-[var(--card-surface)] p-5">
      <div className="text-left">
        <h2 className="text-[15px] font-semibold text-[var(--text)]">Get ready for the launch</h2>
        <p className="text-[12.5px] leading-relaxed text-[var(--text-dim)]">Connect early: Steam first, then Discord. Your account is waiting for you on day one.</p>
      </div>
      <ul className="flex flex-col gap-3.5">
        <Step icon={<SteamIcon className="size-8" />} done={isAuthenticated} title={isAuthenticated ? "Steam connected" : "Connect Steam"} text={isAuthenticated ? (user?.username ?? "Signed in with Steam") : loading ? "Checking your session…" : "Sign in through Steam. We never see your password."}>
          {!isAuthenticated && !loading && <button type="button" onClick={loginWithSteam} className={button}>Connect Steam</button>}
        </Step>
        <Step icon={<DiscordIcon className="size-8" />} done={linked} title={linked ? "Discord connected" : "Connect Discord"} text={!isAuthenticated ? "Connect Steam first" : linked ? (discord?.link?.discordName ?? "Linked") : discord && !discord.available ? "Not available yet" : "Link your Discord to your account."}>
          {isAuthenticated && !linked && (
            <button type="button" disabled={busy || link.loading || !discord?.available} onClick={() => void connectDiscord()} className="lx-discord-btn inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold transition-colors disabled:opacity-50"><DiscordIcon className="size-4" />{busy ? "Opening…" : "Connect Discord"}</button>
          )}
          {linked && discord?.link?.inServer === false && <a href={LINKS.discordInvite} target="_blank" rel="noreferrer" className="lx-discord-btn inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold transition-colors"><DiscordIcon className="size-4" />Join the server</a>}
        </Step>
      </ul>
    </section>
  )
}

/** The whole website while it is "coming soon" (see lib/coming-soon.ts): the logo, the date, a countdown, and the ways to follow the launch. */
export function ComingSoonPage() {
  const navigate = useNavigate()
  const location = useLocation()
  // Any other address (the return from Steam or Discord lands on /settings, /profile ...) is brought back to the front address, keeping the query for the early connect to read.
  useEffect(() => {
    if (location.pathname !== "/") navigate({ pathname: "/", search: location.search }, { replace: true })
  }, [location.pathname, location.search, navigate])
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const left = timeLeft(LAUNCH_AT, now)
  const pad = (value: number) => String(value).padStart(2, "0")
  const parts: Array<[string, string]> = [[String(left.days), "days"], [pad(left.hours), "hours"], [pad(left.minutes), "minutes"], [pad(left.seconds), "seconds"]]
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-[var(--bg)] px-6 py-12 text-center">
      <SiteLogo className="h-12 w-auto" />
      <div className="flex flex-col items-center gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-[var(--text-dim)]">Counter-Strike 2 · Mongolia</p>
        <h1 className="font-display text-[clamp(36px,7vw,64px)] leading-none text-[var(--text)]">Coming soon</h1>
        <p className="max-w-[520px] text-[15px] leading-relaxed text-[var(--text-muted)]">LXC, the community for Counter-Strike 2 players in Mongolia, opens on <span className="text-[var(--text)]">12 December 2026</span>. Ladder, servers, clans, shop and more.</p>
      </div>
      <div className="flex items-start gap-3 max-[420px]:gap-2" role="timer" aria-label="Time left until the launch">
        {parts.map(([value, label]) => (
          <div key={label} className="flex w-[74px] flex-col items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--card-surface)] py-3 max-[420px]:w-[64px]">
            <span className="text-[30px] font-bold leading-none text-[var(--text)] tabular-nums">{value}</span>
            <span className="text-[10.5px] uppercase tracking-[0.18em] text-[var(--text-dim)]">{label}</span>
          </div>
        ))}
      </div>
      <EarlyConnect />
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a href={LINKS.discordInvite} target="_blank" rel="noreferrer" className="lx-discord-btn inline-flex h-10 items-center gap-2 rounded-lg px-5 text-[13px] font-semibold transition-colors"><DiscordIcon className="size-5" />Join our Discord</a>
        {LINKS.tiktok && <a href={LINKS.tiktok} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-lg border border-[var(--line)] px-5 text-[13px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">TikTok</a>}
      </div>
      <p className="flex items-center gap-4 text-[12px] text-[var(--text-dim)]">
        <Link to="/terms" className="hover:text-[var(--text)] hover:underline">Terms of service</Link>
        <Link to="/privacy" className="hover:text-[var(--text)] hover:underline">Privacy policy</Link>
      </p>
    </main>
  )
}
