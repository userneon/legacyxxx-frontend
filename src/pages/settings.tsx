/**
 * Settings (docs/design/settings, settings-connections, settings-notifications, settings-website): connections,
 * notifications and website preferences only. Everything applies immediately; there are no Save buttons.
 * Notifications are saved to the account (users.notification_prefs); website preferences are per device.
 */
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Check, Link2 } from "lucide-react"

import { profileService, type NotificationPrefs } from "@/api"
import { cn } from "@/lib/utils"
import { setWebsitePrefs, useWebsitePrefs, type MotionPreference, type TimeFormat } from "@/lib/website-prefs"
import { Button } from "@/components/ui/button"
import { Segmented } from "@/components/ui/segmented"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/hooks/use-auth"

const SECTIONS = [
  { id: "connections", label: "Connections" },
  { id: "notifications", label: "Notifications" },
  { id: "website", label: "Website" },
] as const

type SectionId = (typeof SECTIONS)[number]["id"]

function SettingsCard({ id, title, description, children }: { id: SectionId; title: string; description: string; children: ReactNode }) {
  return (
    <section id={`settings-${id}`} aria-labelledby={`settings-${id}-title`} className="scroll-mt-6 rounded-xl border border-line-soft bg-card p-5">
      <div className="mb-4 flex flex-col gap-1">
        <h2 id={`settings-${id}-title`} className="m-0 text-[15px] font-semibold text-text">{title}</h2>
        <p className="m-0 text-[13px] text-text-muted">{description}</p>
      </div>
      {children}
    </section>
  )
}

function ConnectionRow({ icon, name, detail, action }: { icon: ReactNode; name: string; detail: ReactNode; action: ReactNode }) {
  return (
    <div className="flex items-center gap-3.5 rounded-[10px] border border-line-soft bg-panel px-3.5 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-raised text-text-muted">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-text">{name}</span>
        <span className="truncate text-xs text-text-dim">{detail}</span>
      </span>
      <span className="shrink-0">{action}</span>
    </div>
  )
}

function SettingRow({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm text-text">{title}</span>
        <span className="text-xs text-text-dim">{description}</span>
      </span>
      <span className="flex shrink-0 items-center gap-3">{children}</span>
    </div>
  )
}

/** Small inline status next to a control: "Saved" after success, the error after a failure (control reverted). */
function SaveStatus({ state }: { state: { kind: "idle" | "saved" | "error"; message?: string } }) {
  if (state.kind === "idle") return null
  return (
    <span role="status" className={cn("text-xs animate-fade-in", state.kind === "saved" ? "text-text-dim" : "text-text-2")}>
      {state.kind === "saved" ? "Saved" : state.message ?? "Couldn't save. Try again."}
    </span>
  )
}

function useSaveStatus() {
  const [state, setState] = useState<{ kind: "idle" | "saved" | "error"; message?: string }>({ kind: "idle" })
  const timer = useRef<number | undefined>(undefined)
  const show = (next: typeof state) => {
    window.clearTimeout(timer.current)
    setState(next)
    if (next.kind === "saved") timer.current = window.setTimeout(() => setState({ kind: "idle" }), 1_800)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return [state, show] as const
}

function SteamIcon() {
  return <img src="/steam-logo.webp" alt="" width={20} height={20} className="size-5 object-contain" />
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

function Connections() {
  const { user } = useAuth()
  return (
    <SettingsCard id="connections" title="Connections" description="Accounts linked to your profile.">
      <div className="flex flex-col gap-2.5">
        <ConnectionRow
          icon={<SteamIcon />}
          name="Steam"
          detail={<span className="select-text tabular-nums">{user?.steamId ?? "Steam account"}</span>}
          action={
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-live">
              <Check className="size-3.5" aria-hidden />
              Connected
            </span>
          }
        />
        {/* The Discord /link flow needs the bot's /bot/link API, which is not live yet. */}
        <ConnectionRow
          icon={<DiscordIcon />}
          name="Discord"
          detail="Get your stats with /stats and join giveaways."
          action={
            <Button variant="outline" size="sm" disabled aria-disabled title="Coming soon">
              <Link2 className="size-3.5" aria-hidden />
              Coming soon
            </Button>
          }
        />
        <ConnectionRow
          icon={<span className="text-[11px] font-bold tracking-tight text-text-2">FC</span>}
          name="FACEIT"
          detail="Found through your Steam account — nothing to link."
          action={<span className="text-xs text-text-muted">Auto-detected</span>}
        />
      </div>
    </SettingsCard>
  )
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { tournaments: true, rankChanges: true, penalties: true }

function Notifications() {
  const { user, refreshUser } = useAuth()
  const [prefs, setPrefs] = useState<NotificationPrefs>(user?.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS)
  const [status, setStatus] = useSaveStatus()

  useEffect(() => {
    if (user?.notificationPrefs) setPrefs(user.notificationPrefs)
  }, [user?.notificationPrefs])

  const update = async (key: "tournaments" | "rankChanges", value: boolean) => {
    const previous = prefs
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    try {
      await profileService.updateProfile({ notificationPrefs: { tournaments: next.tournaments, rankChanges: next.rankChanges } })
      setStatus({ kind: "saved" })
      void refreshUser()
    } catch {
      setPrefs(previous)
      setStatus({ kind: "error", message: "Couldn't save. Try again." })
    }
  }

  return (
    <SettingsCard id="notifications" title="Notifications" description="What shows up in the bell.">
      <div className="flex flex-col">
        <SettingRow title="Tournaments" description="Registration opens, check-in, your next match.">
          <Switch checked={prefs.tournaments} onCheckedChange={(value) => void update("tournaments", value)} aria-label="Tournament notifications" />
        </SettingRow>
        <SettingRow title="Rank changes" description="When you rank up or down.">
          <Switch checked={prefs.rankChanges} onCheckedChange={(value) => void update("rankChanges", value)} aria-label="Rank change notifications" />
        </SettingRow>
        <SettingRow title="Penalties" description="Any penalty on your account.">
          <span className="text-xs text-text-dim">Always on</span>
          <Switch checked disabled aria-label="Penalty notifications are always on" />
        </SettingRow>
      </div>
      <div className="min-h-4 pt-1">
        <SaveStatus state={status} />
      </div>
    </SettingsCard>
  )
}

function Website() {
  const prefs = useWebsitePrefs()
  const [status, setStatus] = useSaveStatus()
  const apply = (patch: Parameters<typeof setWebsitePrefs>[0]) => {
    setWebsitePrefs(patch)
    setStatus({ kind: "saved" })
  }

  return (
    <SettingsCard id="website" title="Website" description="How Legacy-X looks and behaves on this device. Changes apply right away.">
      <div className="flex flex-col">
        <SettingRow title="Kill feed" description="Live kills in the top bar.">
          <Switch checked={prefs.killFeed} onCheckedChange={(value) => apply({ killFeed: value })} aria-label="Kill feed" />
        </SettingRow>
        <SettingRow title="Start with sidebar collapsed" description="Open the site with the icon-only sidebar.">
          <Switch checked={prefs.sidebarCollapsed} onCheckedChange={(value) => apply({ sidebarCollapsed: value })} aria-label="Start with sidebar collapsed" />
        </SettingRow>
        <SettingRow title="Motion" description="Animations and transitions. System follows your OS setting.">
          <Segmented<MotionPreference>
            ariaLabel="Motion"
            role="radiogroup"
            size="sm"
            value={prefs.motion}
            onChange={(motion) => apply({ motion })}
            options={[
              { value: "system", label: "System" },
              { value: "reduce", label: "Reduce" },
              { value: "full", label: "Full" },
            ]}
          />
        </SettingRow>
        <SettingRow title="Time format" description="Used for match times, countdowns and dates.">
          <Segmented<TimeFormat>
            ariaLabel="Time format"
            role="radiogroup"
            size="sm"
            value={prefs.timeFormat}
            onChange={(timeFormat) => apply({ timeFormat })}
            options={[
              { value: "24h", label: "24h" },
              { value: "12h", label: "12h" },
            ]}
          />
        </SettingRow>
      </div>
      <div className="min-h-4 pt-1">
        <SaveStatus state={status} />
      </div>
    </SettingsCard>
  )
}

/** Left nav with scroll-spy: the section nearest the top of the content panel is active. */
function useScrollSpy(): [SectionId, (id: SectionId) => void] {
  const [active, setActive] = useState<SectionId>("connections")
  useEffect(() => {
    const elements = SECTIONS.map(({ id }) => document.getElementById(`settings-${id}`)).filter((element): element is HTMLElement => Boolean(element))
    const visible = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
        const panel = document.getElementById("content-panel")
        // At the bottom of the panel the last section wins even if it is short.
        if (panel && panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 4) {
          setActive(SECTIONS[SECTIONS.length - 1].id)
          return
        }
        const first = SECTIONS.find(({ id }) => (visible.get(`settings-${id}`) ?? 0) > 0)
        if (first) setActive(first.id)
      },
      { threshold: [0, 0.25, 0.5, 1], rootMargin: "0px 0px -40% 0px" },
    )
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])
  const jump = (id: SectionId) => {
    setActive(id)
    document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: document.documentElement.dataset.motion === "reduce" ? "auto" : "smooth", block: "start" })
  }
  return [active, jump]
}

export function SettingsPage() {
  const [active, jump] = useScrollSpy()
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:gap-10 lg:px-8">
      <aside className="flex shrink-0 flex-col gap-4 lg:sticky lg:top-6 lg:w-[200px] lg:self-start">
        <h1 className="m-0 px-3 text-[22px] font-semibold tracking-[-0.3px] text-text">Settings</h1>
        <nav aria-label="Settings sections" className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-current={active === id ? "true" : undefined}
              onClick={() => jump(id)}
              className={cn(
                "press h-9 shrink-0 rounded-lg px-3 text-left text-sm transition-colors duration-150",
                active === id ? "bg-raised text-text" : "text-text-muted hover:bg-card hover:text-text",
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="flex w-full max-w-[720px] min-w-0 flex-col gap-4 lg:pt-[52px]">
        <Connections />
        <Notifications />
        <Website />
      </div>
    </div>
  )
}
