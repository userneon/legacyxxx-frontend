import { useEffect, useRef, useState } from "react"
import { Check, CircleCheck } from "lucide-react"

import { cn } from "@/lib/utils"
import { settingsService, type NotificationSettings } from "@/api/settings"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { setWebsitePreference, useWebsitePreferences, type TimeFormat } from "@/lib/preferences"
import { PlayerAvatar } from "@/components/player-avatar"
import { Segmented } from "@/components/segmented"
import { SteamIcon } from "@/components/steam-login-gate"
import { Skeleton } from "@/components/ui/skeleton"

const SECTIONS = [
  { id: "connections", label: "Connections" },
  { id: "notifications", label: "Notifications" },
  { id: "website", label: "Website" },
] as const
type SectionId = (typeof SECTIONS)[number]["id"]

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange?: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative h-6 w-[42px] shrink-0 rounded-full p-0.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 disabled:cursor-default disabled:opacity-50",
        checked ? "bg-[var(--accent-solid)]" : "bg-[var(--line-strong)]",
      )}
    >
      <span className={cn("block size-5 rounded-full transition-transform duration-200 ease-[var(--ease-out)] motion-reduce:transition-none", checked ? "translate-x-[18px] bg-[var(--accent-on)]" : "translate-x-0 bg-[var(--accent-solid)]")} />
    </button>
  )
}

function Row({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="text-sm font-medium text-[var(--text)]">{title}</span>
        <span className="text-xs text-[var(--text-dim)]">{description}</span>
      </span>
      {children}
    </div>
  )
}

/** A short "Saved" that fades out; every control on this page applies immediately. */
function useSavedFlash() {
  const [visible, setVisible] = useState(false)
  const timer = useRef<number | null>(null)
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])
  const flash = () => {
    setVisible(true)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setVisible(false), 1600)
  }
  const node = (
    <span aria-live="polite" className={cn("inline-flex items-center gap-1 text-xs text-[var(--text-muted)] transition-opacity duration-200", visible ? "opacity-100" : "opacity-0")}>
      <Check className="size-3.5" />
      Saved
    </span>
  )
  return { flash, node }
}

function Section({ id, title, description, aside, children }: { id: SectionId; title: string; description: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-6 overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)]">
      <div className="flex items-start justify-between gap-4 px-5 pb-1 pt-[18px]">
        <div className="flex flex-col gap-1">
          <h2 id={`${id}-t`} className="text-[15px] font-semibold text-[var(--text)]">{title}</h2>
          <span className="text-[13px] text-[var(--text-muted)]">{description}</span>
        </div>
        {aside}
      </div>
      <div className="flex flex-col gap-4 px-5 pb-5 pt-4">{children}</div>
    </section>
  )
}

function ConnectionRow({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: React.ReactNode; action: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3.5 rounded-[10px] border border-[var(--line-soft)] bg-[var(--panel)] px-3.5 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-[var(--line-soft)] text-[var(--text)]">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
        <span className="text-sm font-medium text-[var(--text)]">{title}</span>
        <span className="truncate text-xs text-[var(--text-dim)]">{description}</span>
      </span>
      {action}
    </div>
  )
}

function Notifications() {
  const { data, loading, error, refetch } = useApiQuery<NotificationSettings>((signal) => settingsService.getNotifications({ signal }))
  const [prefs, setPrefs] = useState<NotificationSettings | null>(null)
  const [failure, setFailure] = useState("")
  const saved = useSavedFlash()
  useEffect(() => { if (data) setPrefs(data) }, [data])

  const change = async (key: "tournaments" | "rankChanges", value: boolean) => {
    if (!prefs) return
    const previous = prefs
    setPrefs({ ...prefs, [key]: value })
    setFailure("")
    try {
      setPrefs(await settingsService.updateNotifications({ [key]: value }))
      saved.flash()
    } catch {
      setPrefs(previous)
      setFailure("Couldn't save that change. Try again.")
    }
  }

  return (
    <Section id="notifications" title="Notifications" description="What shows up in the bell." aside={saved.node}>
      {!prefs ? (
        error && !loading ? (
          <p className="text-[13px] text-[var(--text-dim)]">Couldn't load your notification settings. <button type="button" onClick={refetch} className="text-[var(--text-2)] underline-offset-4 hover:underline">Retry</button></p>
        ) : (
          <div className="flex flex-col gap-4" aria-hidden="true">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-9 rounded-lg bg-[var(--raised)]" />)}</div>
        )
      ) : (
        <>
          <Row title="Tournaments" description="Registration opens, check-in, your next match.">
            <Switch label="Tournaments" checked={prefs.tournaments} onChange={(next) => void change("tournaments", next)} />
          </Row>
          <Row title="Rank changes" description="When you rank up or down.">
            <Switch label="Rank changes" checked={prefs.rankChanges} onChange={(next) => void change("rankChanges", next)} />
          </Row>
          <Row title="Penalties" description="Any penalty on your account.">
            <span className="text-xs text-[var(--text-dim)]">Always on</span>
            <Switch label="Penalties" checked disabled />
          </Row>
          {failure && <p role="alert" className="text-xs text-[var(--text-2)]">{failure}</p>}
        </>
      )}
    </Section>
  )
}

function Website() {
  const prefs = useWebsitePreferences()
  const saved = useSavedFlash()
  const set = <K extends "killFeed" | "sidebarCollapsed" | "timeFormat">(key: K, value: Parameters<typeof setWebsitePreference<K>>[1]) => {
    setWebsitePreference(key, value)
    saved.flash()
  }
  return (
    <Section id="website" title="Website" description="How Legacy-X looks and behaves on this device. Changes apply right away." aside={saved.node}>
      <Row title="Kill feed" description="Live kills in the top bar.">
        <Switch label="Kill feed" checked={prefs.killFeed} onChange={(next) => set("killFeed", next)} />
      </Row>
      <Row title="Start with sidebar collapsed" description="Open the site with the icon-only sidebar.">
        <Switch label="Start with sidebar collapsed" checked={prefs.sidebarCollapsed} onChange={(next) => set("sidebarCollapsed", next)} />
      </Row>
      <Row title="Time format" description="Used for match times, countdowns and dates.">
        <Segmented<TimeFormat>
          ariaLabel="Time format"
          size="sm"
          value={prefs.timeFormat}
          onChange={(value) => set("timeFormat", value)}
          options={[{ value: "24h", label: "24h" }, { value: "12h", label: "12h" }]}
        />
      </Row>
    </Section>
  )
}

export function SettingsPage() {
  const { user } = useAuth()
  const scroller = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<SectionId>("connections")

  // Scroll-spy: the section nearest the top of the panel is the active nav item.
  useEffect(() => {
    const root = scroller.current
    if (!root) return
    const onScroll = () => {
      const top = root.getBoundingClientRect().top
      let current: SectionId = "connections"
      for (const section of SECTIONS) {
        const node = document.getElementById(section.id)
        if (node && node.getBoundingClientRect().top - top <= 120) current = section.id
      }
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) current = "website"
      setActive(current)
    }
    onScroll()
    root.addEventListener("scroll", onScroll, { passive: true })
    return () => root.removeEventListener("scroll", onScroll)
  }, [])

  const jump = (id: SectionId) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
    setActive(id)
  }

  return (
    <div ref={scroller} className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
      <div className="grid gap-10 px-8 pb-12 pt-6 md:grid-cols-[200px_minmax(0,720px)] max-md:gap-4 max-md:px-4">
        <nav aria-label="Settings sections" className="flex flex-col gap-0.5 self-start md:sticky md:top-6 max-md:flex-row max-md:flex-wrap">
          <h1 className="mb-3.5 ml-3 text-[22px] font-semibold tracking-[-0.3px] text-[var(--text)] max-md:mb-1 max-md:w-full">Settings</h1>
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              aria-current={active === section.id}
              onClick={() => jump(section.id)}
              className={cn(
                "flex h-9 items-center rounded-lg px-3 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60",
                active === section.id ? "bg-[var(--raised)] text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
            >
              {section.label}
            </button>
          ))}
        </nav>
        <div className="flex flex-col gap-4 md:pt-11">
          <Section id="connections" title="Connections" description="Accounts linked to your profile.">
            <ConnectionRow
              icon={user?.avatar ? <PlayerAvatar avatar={user.avatar} name={user.username} className="size-9 rounded-[9px] text-xs" /> : <SteamIcon className="size-[18px]" />}
              title="Steam"
              description={user ? `${user.username} · ${user.steamId}` : "—"}
              action={<span className="inline-flex shrink-0 items-center gap-[5px] text-xs font-medium text-[var(--status-green)]"><CircleCheck className="size-3.5" />Connected</span>}
            />
            <ConnectionRow
              icon={<DiscordGlyph />}
              title="Discord"
              description="Get your stats with /stats and join giveaways."
              action={<button type="button" disabled className="inline-flex h-[34px] shrink-0 items-center rounded-lg border border-[var(--line)] px-3.5 text-[13px] font-medium text-[var(--text-muted)] disabled:opacity-60">Coming soon</button>}
            />
            <ConnectionRow
              icon={<span className="text-[11px] font-bold tracking-tight">F</span>}
              title="FACEIT"
              description="Found through your Steam account — nothing to link."
              action={<span className="shrink-0 text-xs text-[var(--text-dim)]">Auto-detected</span>}
            />
          </Section>
          <Notifications />
          <Website />
        </div>
      </div>
    </div>
  )
}

function DiscordGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]" fill="currentColor">
      <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52c-.21.38-.44.87-.61 1.25a18.3 18.3 0 0 0-5.49 0 12.6 12.6 0 0 0-.62-1.25 19.7 19.7 0 0 0-4.88 1.52C.53 9.05-.32 13.58.1 18.06a19.9 19.9 0 0 0 5.99 3.03c.46-.63.87-1.3 1.23-1.99-.66-.25-1.28-.55-1.87-.9l.37-.29c3.93 1.79 8.18 1.79 12.06 0l.37.3c-.6.35-1.22.64-1.87.89.36.7.78 1.36 1.23 1.99a19.8 19.8 0 0 0 6-3.03c.5-5.18-.84-9.68-3.55-13.66ZM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42Z" />
    </svg>
  )
}
