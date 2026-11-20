import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { SiteLogo } from "@/components/site-logo"
import { LAUNCH_AT, timeLeft } from "@/lib/coming-soon"
import { LINKS } from "@/lib/links"

/** The whole website while it is "coming soon" (see lib/coming-soon.ts): the logo, the date, a countdown, and the ways to follow the launch. */
export function ComingSoonPage() {
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
        <p className="max-w-[520px] text-[15px] leading-relaxed text-[var(--text-muted)]">LXC, the community for Counter-Strike 2 players in Mongolia, opens on <span className="text-[var(--text)]">1 December 2026</span>. Ladder, servers, clans, shop and more.</p>
      </div>
      <div className="flex items-start gap-3 max-[420px]:gap-2" role="timer" aria-label="Time left until the launch">
        {parts.map(([value, label]) => (
          <div key={label} className="flex w-[74px] flex-col items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--card-surface)] py-3 max-[420px]:w-[64px]">
            <span className="text-[30px] font-bold leading-none text-[var(--text)] tabular-nums">{value}</span>
            <span className="text-[10.5px] uppercase tracking-[0.18em] text-[var(--text-dim)]">{label}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a href={LINKS.discordInvite} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-lg border border-[var(--line-strong)] bg-[var(--raised)] px-5 text-[13px] font-semibold text-[var(--text)] transition-colors hover:bg-[var(--card-surface)]">Join our Discord</a>
        {LINKS.tiktok && <a href={LINKS.tiktok} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-lg border border-[var(--line)] px-5 text-[13px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">TikTok</a>}
      </div>
      <p className="flex items-center gap-4 text-[12px] text-[var(--text-dim)]">
        <Link to="/terms" className="hover:text-[var(--text)] hover:underline">Terms of service</Link>
        <Link to="/privacy" className="hover:text-[var(--text)] hover:underline">Privacy policy</Link>
      </p>
    </main>
  )
}
