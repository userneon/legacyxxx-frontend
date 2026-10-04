import { useEffect, useState } from "react"

import { BackgroundBeams } from "@/components/background-beams"
import { DiscordIcon } from "@/components/discord-strip"
import { LAUNCH_AT } from "@/lib/launch"
import { LINKS } from "@/lib/links"

const pad = (value: number) => String(value).padStart(2, "0")

function remaining(now: number) {
  const total = Math.max(0, Math.floor((LAUNCH_AT - now) / 1000))
  return { days: Math.floor(total / 86400), hours: Math.floor((total % 86400) / 3600), minutes: Math.floor((total % 3600) / 60), seconds: total % 60, done: total === 0 }
}

/** The only page visitors see before launch: a countdown to 1 December and the Discord invite. */
export function LaunchCountdown() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    document.title = "LEGACY-X · Opens December 1"
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const time = remaining(now)
  // At zero the page reloads once and the real site appears.
  useEffect(() => {
    if (time.done) window.location.reload()
  }, [time.done])

  const cells = [
    { label: "Days", value: String(time.days) },
    { label: "Hours", value: pad(time.hours) },
    { label: "Minutes", value: pad(time.minutes) },
    { label: "Seconds", value: pad(time.seconds) },
  ]

  return (
    <main className="relative flex min-h-svh items-center justify-center px-4 py-10">
      <BackgroundBeams />
      <div className="lx-glass-shell relative flex w-full max-w-2xl flex-col items-center gap-8 rounded-2xl px-6 py-12 text-center max-sm:py-9">
        <img src="/logolegacyx.webp" alt="LEGACY-X" width={56} height={56} className="size-14" />
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">LEGACY-X opens</p>
          <h1 className="font-display text-[clamp(2rem,6vw,3.25rem)] font-bold leading-tight text-[var(--text)]">
            <span className="text-[var(--brand-bright)]">December 1</span>
          </h1>
        </div>

        <div role="timer" aria-label="Time left until launch" className="lx-stat-grid grid w-full grid-cols-4 overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
          {cells.map((cell) => (
            <div key={cell.label} className="flex flex-col items-center gap-1 px-2 py-5">
              <span className="text-[clamp(1.75rem,7vw,3rem)] font-bold leading-none text-[var(--text)]">{cell.value}</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">{cell.label}</span>
            </div>
          ))}
        </div>

        <a
          href={LINKS.discordInvite}
          target="_blank"
          rel="noopener noreferrer"
          className="lx-primary-button inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2"
        >
          <DiscordIcon className="size-4" />
          Join our Discord community
        </a>
      </div>
    </main>
  )
}
