import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bell, Check, CircleCheck, Frame, Link2, Lock, RotateCcw, MonitorSmartphone, type LucideIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { cosmeticsService, type CosmeticKind, type Cosmetics, type FrameItem } from "@/api/cosmetics"
import { nameProps } from "@/lib/cosmetics"
import { walletService, type Wallet } from "@/api"
import { FramedAvatar } from "@/components/framed-avatar"
import { discordService, type DiscordLinkState } from "@/api/discord"
import { settingsService, type NotificationSettings } from "@/api/settings"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { setWebsitePreference, useWebsitePreferences, type TimeFormat } from "@/lib/preferences"
import { PlayerAvatar } from "@/components/player-avatar"
import { Segmented } from "@/components/segmented"
import { SteamIcon } from "@/components/steam-login-gate"
import { Skeleton } from "@/components/ui/skeleton"

type SectionId = "connections" | "notifications" | "appearance" | "website"
const SECTION_ICON: Record<SectionId, LucideIcon> = { connections: Link2, notifications: Bell, appearance: Frame, website: MonitorSmartphone }

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
        "group",
        "relative h-6 w-[42px] shrink-0 rounded-full p-0.5 transition-[background-color,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50 disabled:cursor-default disabled:opacity-50",
        checked ? "bg-[linear-gradient(180deg,var(--brand-bright),var(--brand))]" : "bg-[var(--line-strong)]",
      )}
    >
      {/* The knob springs across and stretches a little on the way. */}
      <span className={cn("block size-5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.35)] transition-[translate,width] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none group-active:w-6", checked ? "translate-x-[18px]" : "translate-x-0")} />
    </button>
  )
}

function Row({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="-mx-2 flex items-center gap-4 rounded-lg px-2 py-1.5 transition-colors duration-300 hover:bg-[var(--raised)]">
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
    <span
      aria-live="polite"
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-[var(--raised)] px-2.5 text-xs font-medium text-[var(--text-2)] transition-[opacity,scale] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        visible ? "scale-100 opacity-100" : "scale-90 opacity-0",
      )}
    >
      <Check className="size-3.5 text-[var(--text-2)]" />
      Saved
    </span>
  )
  return { flash, node }
}

function Section({ id, title, description, aside, children, index = 0 }: { id: SectionId; title: string; description: string; aside?: React.ReactNode; children: React.ReactNode; index?: number }) {
  const Icon = SECTION_ICON[id]
  return (
    <section
      id={id}
      aria-labelledby={`${id}-t`}
      style={{ animationDelay: `${120 + index * 80}ms` }}
      className="lx-swap-in relative scroll-mt-6 overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] transition-[border-color,box-shadow] duration-500 hover:border-[var(--line)]"
    >
      <span aria-hidden="true" className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent" />
      <div className="flex items-start justify-between gap-4 px-5 pb-1 pt-[18px]">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--raised)] text-[var(--text-2)] ring-1 ring-inset ring-[var(--line-strong)]"><Icon className="size-[18px]" /></span>
          <div className="flex flex-col gap-1">
            <h2 id={`${id}-t`} className="text-[15px] font-semibold text-[var(--text)]">{title}</h2>
            <span className="text-[13px] text-[var(--text-muted)]">{description}</span>
          </div>
        </div>
        {aside}
      </div>
      <div className="flex flex-col gap-4 px-5 pb-5 pt-4">{children}</div>
    </section>
  )
}

function ConnectionRow({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: React.ReactNode; action: React.ReactNode }) {
  return (
    <div className="lx-layer flex items-center gap-3.5 rounded-[10px] border border-[var(--line-soft)] bg-[var(--panel)] px-3.5 py-3 transition-[border-color,translate,box-shadow] duration-500 hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:duration-300">
      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-[var(--line-soft)] text-[var(--text)]">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
        <span className="text-sm font-medium text-[var(--text)]">{title}</span>
        <span className="truncate text-xs text-[var(--text-dim)]">{description}</span>
      </span>
      {action}
    </div>
  )
}

const DISCORD_RESULTS: Record<string, { ok: boolean; text: string }> = {
  linked: { ok: true, text: "Discord linked. Your rank role arrives in a moment." },
  cancelled: { ok: false, text: "Discord link cancelled." },
  expired: { ok: false, text: "That link expired. Try again." },
  failed: { ok: false, text: "Discord could not be linked. Try again." },
  unavailable: { ok: false, text: "Linking Discord is not set up yet." },
}

/** Link or unlink Discord from here: Discord asks for consent, then the rank role follows. */
function DiscordConnection() {
  const { data, loading, error, refetch } = useApiQuery<DiscordLinkState>((signal) => discordService.getLink({ signal }))
  const [busy, setBusy] = useState(false)

  // Coming back from Discord: say how it went once, then clean the address.
  useEffect(() => {
    const url = new URL(window.location.href)
    const result = url.searchParams.get("discord")
    if (!result) return
    const outcome = DISCORD_RESULTS[result]
    if (outcome) (outcome.ok ? toast.success : toast.error)(outcome.text)
    url.searchParams.delete("discord")
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
    void refetch()
  }, [refetch])

  const link = async () => {
    setBusy(true)
    try {
      const { url } = await discordService.start()
      window.location.assign(url)
    } catch {
      toast.error("Could not start the Discord link", { description: "Try again in a moment." })
      setBusy(false)
    }
  }
  const unlink = async () => {
    if (!window.confirm("Unlink your Discord account? You lose the rank role.")) return
    setBusy(true)
    try {
      await discordService.unlink()
      toast.success("Discord unlinked")
      await refetch()
    } catch {
      toast.error("Could not unlink Discord", { description: "Try again in a moment." })
    } finally {
      setBusy(false)
    }
  }
  const button = "inline-flex h-[34px] shrink-0 items-center rounded-lg border border-[var(--line)] px-3.5 text-[13px] font-medium transition-colors disabled:opacity-60"
  return (
    <ConnectionRow
      icon={<DiscordGlyph />}
      title="Discord"
      description={data?.link ? `${data.link.discordName} · rank role and /stats in Discord` : "Link Discord for your rank role and /stats, and get 50 LX once."}
      action={
        loading ? <Skeleton className="h-[34px] w-24 rounded-lg" />
        : error ? <button type="button" onClick={refetch} className={cn(button, "text-[var(--text-2)] hover:border-[var(--line-strong)]")}>Retry</button>
        : data?.link ? (
          <span className="flex shrink-0 items-center gap-3">
            <span className="inline-flex items-center gap-[5px] text-xs font-medium text-[var(--status-green)]"><CircleCheck className="size-3.5" />Linked</span>
            <button type="button" disabled={busy} onClick={() => void unlink()} className={cn(button, "text-[var(--text-2)] hover:border-[var(--line-strong)] hover:bg-[var(--raised)]")}>Unlink</button>
          </span>
        ) : (
          <button type="button" disabled={busy || !data?.available} onClick={() => void link()} title={data?.available ? undefined : "Not set up yet"} className={cn(button, data?.available ? "lx-primary-button border-transparent font-semibold" : "text-[var(--text-muted)]")}>
            {data?.available ? "Link Discord" : "Not set up yet"}
          </button>
        )
      }
    />
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
    <Section id="notifications" index={1} title="Notifications" description="What shows up in the bell." aside={saved.node}>
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

type FrameFilter = "all" | "mine" | "earned"

const KINDS: Array<{ value: CosmeticKind; label: string; noun: string }> = [
  { value: "frame", label: "Frames", noun: "frame" },
  { value: "name_color", label: "Name colour", noun: "colour" },
  { value: "name_glow", label: "Name glow", noun: "glow" },
]

function Appearance() {
  const { user } = useAuth()
  const { data, loading, error, refetch } = useApiQuery<Cosmetics>((signal) => cosmeticsService.getMine({ signal }), { queryKey: user ? `cosmetics:${user.id}` : "cosmetics:guest" })
  const { data: wallet, refetch: refetchWallet } = useApiQuery<Wallet>((signal) => walletService.getMine({ signal }), { enabled: Boolean(user), queryKey: user ? `wallet:${user.id}` : "wallet:guest" })
  const [busy, setBusy] = useState(false)
  const [kind, setKind] = useState<CosmeticKind>("frame")
  const [filter, setFilter] = useState<FrameFilter>("mine")
  const navigate = useNavigate()
  const [picked, setPicked] = useState<Partial<Record<CosmeticKind, string>>>({})
  const saved = useSavedFlash()

  const lists: Record<CosmeticKind, FrameItem[]> = { frame: data?.frames ?? [], name_color: data?.nameColors ?? [], name_glow: data?.nameGlows ?? [] }
  const worn: Record<CosmeticKind, string | null> = { frame: data?.equippedFrame ?? null, name_color: data?.equippedNameColor ?? null, name_glow: data?.equippedNameGlow ?? null }
  const noun = KINDS.find((entry) => entry.value === kind)?.noun ?? "item"
  const frames = lists[kind]
  const selectedId = picked[kind] ?? worn[kind] ?? frames[0]?.id ?? null
  const selected = frames.find((item) => item.id === selectedId) ?? null
  const shown = frames.filter((item) => filter === "all" || (filter === "mine" ? item.owned : item.unlock === "achievement"))
  const balance = wallet?.balance ?? null

  // The preview shows what you would look like: the item you are looking at, plus whatever you already wear of the other kinds.
  const previewOf = (of: CosmeticKind) => (of === kind ? selected : lists[of].find((item) => item.id === worn[of])) ?? null
  const previewFrame = previewOf("frame")
  const previewColor = previewOf("name_color")
  const previewGlow = previewOf("name_glow")
  const previewLook = { color: previewColor?.color ?? null, colorFx: previewColor?.fx ?? null, glow: previewGlow?.glow ?? null, glowFx: previewGlow?.fx ?? null }

  const run = async (work: () => Promise<unknown>, failure: string) => {
    setBusy(true)
    try {
      await work()
      saved.flash()
      await Promise.all([refetch(), refetchWallet()])
    } catch (caught) {
      toast.error(failure, { description: caught instanceof Error ? caught.message : "Try again in a moment." })
    } finally {
      setBusy(false)
    }
  }
  const wear = (item: string | null) => run(() => cosmeticsService.equip(kind, item), "Could not change it")

  const button = "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] px-3.5 text-[13px] font-semibold transition-colors disabled:cursor-default disabled:opacity-60"
  const secondary = cn(button, "text-[var(--text-2)] hover:border-[var(--line-strong)] hover:bg-[var(--raised)]")
  const primary = cn(button, "lx-primary-button border-transparent")
  const action = (item: FrameItem) => {
    if (worn[kind] === item.id) return <button type="button" disabled={busy} onClick={() => void wear(null)} className={secondary}>Take off</button>
    if (item.owned) return <button type="button" disabled={busy} onClick={() => void wear(item.id)} className={primary}>Wear</button>
    if (item.unlock === "coin") return <button type="button" onClick={() => navigate(`/shop?item=${encodeURIComponent(item.id)}`)} className={primary}>Get it in the Shop</button>
    return <button type="button" disabled className={secondary}>Locked</button>
  }
  const note = (item: FrameItem) => {
    if (worn[kind] === item.id) return `You are wearing this ${noun}.`
    if (item.owned) return item.unlock === "free" ? "Free for everyone." : `You own this ${noun}.`
    if (item.unlock === "coin") {
      return `${item.price.toLocaleString()} LX in the Shop.`
    }
    return item.requirement || "Earned in game, not for sale."
  }
  const badge = (item: FrameItem) => {
    if (worn[kind] === item.id) return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--status-green)]"><Check className="size-3" />Worn</span>
    if (item.owned) return <span className="text-[10px] text-[var(--text-dim)]">{item.unlock === "free" ? "Free" : "Owned"}</span>
    if (item.unlock === "coin") return <span className="text-[10px] font-medium text-[var(--text-2)]">{item.price.toLocaleString()} LX</span>
    return <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-dim)]"><Lock className="size-3" />Earned</span>
  }
  const sampleName = user?.username ?? "Player"

  return (
    <Section id="appearance" index={0} title="Appearance" description="Frames, name colours and glows. They are only for show and never change your matches or EXP." aside={saved.node}>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-[210px_minmax(0,1fr)]"><Skeleton className="h-[300px] rounded-[10px]" /><Skeleton className="h-[300px] rounded-[10px]" /></div>
      ) : error || !data ? (
        <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load your appearance.<button type="button" onClick={refetch} className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-[var(--line)] px-3.5 text-[13px] font-medium text-[var(--text-2)] hover:bg-[var(--raised)]"><RotateCcw className="size-3.5" />Retry</button></p>
      ) : (
        <div className="grid gap-4 md:grid-cols-[210px_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-3 self-start rounded-[10px] border border-[var(--line-soft)] bg-[var(--panel)] p-4 md:sticky md:top-6">
            <FramedAvatar avatar={user?.avatar} name={user?.username} frame={previewFrame?.id ?? null} size={150} />
            <span {...nameProps(previewLook, "max-w-full truncate text-[15px] font-bold text-[var(--text)]")}>{sampleName}</span>
            <div className="flex w-full flex-col items-center gap-1 text-center">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-dim)]">Preview</span>
              <span className="text-[15px] font-semibold text-[var(--text)]">{selected?.name ?? `No ${noun}`}</span>
              {selected && <span className="text-xs text-[var(--text-dim)]">{note(selected)}</span>}
            </div>
            {selected && <div className="w-full">{action(selected)}</div>}
            {balance !== null && <span className="text-[11px] text-[var(--text-dim)]">Your LX: <span className="font-semibold text-[var(--text-2)]">{balance.toLocaleString()}</span></span>}
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Segmented<CosmeticKind> ariaLabel="What to change" size="sm" value={kind} onChange={(next) => { setKind(next); setFilter("all") }} options={KINDS.map(({ value, label }) => ({ value, label }))} />
              <Segmented<FrameFilter>
                ariaLabel="Filter"
                size="sm"
                value={filter}
                onChange={setFilter}
                options={[{ value: "mine", label: "Mine" }, { value: "all", label: "All" }, { value: "earned", label: "Earned" }]}
              />
            </div>
            <p className="text-xs text-[var(--text-dim)]">You can wear what you own here. <button type="button" onClick={() => navigate("/shop")} className="font-medium text-[var(--text-2)] underline-offset-2 hover:text-[var(--text)] hover:underline">Browse the Shop</button> for more.</p>
            {shown.length === 0 ? (
              <p className="py-6 text-[13px] text-[var(--text-dim)]">{filter === "mine" ? `You do not own a ${noun} yet.` : "Nothing here."}</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {shown.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setPicked((current) => ({ ...current, [kind]: item.id }))}
                      aria-pressed={selectedId === item.id}
                      className={cn(
                        "flex w-full flex-col items-center gap-1 rounded-[10px] border bg-[var(--panel)] px-2 pb-2.5 pt-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50",
                        selectedId === item.id ? "border-[var(--text-2)] bg-[var(--raised)]" : "border-[var(--line-soft)] hover:border-[var(--line-strong)]",
                      )}
                    >
                      {kind === "frame" ? (
                        <FramedAvatar avatar={user?.avatar} name={user?.username} frame={item.id} size={76} />
                      ) : (
                        <span className="flex h-[76px] w-full items-center justify-center overflow-hidden px-1"><span {...nameProps(kind === "name_color" ? { color: item.color ?? null, colorFx: item.fx ?? null } : { glow: item.glow ?? null, glowFx: item.fx ?? null }, "truncate text-[15px] font-bold text-[var(--text)]")}>{sampleName}</span></span>
                      )}
                      <span className="w-full truncate text-center text-xs font-medium text-[var(--text)]">{item.name}</span>
                      {badge(item)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Section>
  )
}

function Website() {
  const prefs = useWebsitePreferences()
  const saved = useSavedFlash()
  const set = <K extends "sidebarCollapsed" | "timeFormat">(key: K, value: Parameters<typeof setWebsitePreference<K>>[1]) => {
    setWebsitePreference(key, value)
    saved.flash()
  }
  return (
    <Section id="website" index={2} title="Website" description="How Legacy-X looks and behaves on this device. Changes apply right away." aside={saved.node}>
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

/** Profile → Settings: connections, notifications and how the site behaves on this device. */
export function AccountSettings() {
  const { user } = useAuth()
  return (
    <div className="flex flex-col gap-4">
      <Section id="connections" title="Connections" description="Accounts linked to your profile.">
        <ConnectionRow
          icon={user?.avatar ? <PlayerAvatar avatar={user.avatar} name={user.username} className="size-9 rounded-[9px] text-xs" /> : <SteamIcon className="size-[18px]" />}
          title="Steam"
          description={user ? `${user.username} · ${user.steamId}` : "—"}
          action={<span className="inline-flex shrink-0 items-center gap-[5px] text-xs font-medium text-[var(--status-green)]"><CircleCheck className="size-3.5" />Connected</span>}
        />
        <DiscordConnection />
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
  )
}

/** Profile → Appearance: avatar frames. */
export function AppearanceSettings() {
  return <div className="flex flex-col gap-4"><Appearance /></div>
}

function DiscordGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]" fill="currentColor">
      <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52c-.21.38-.44.87-.61 1.25a18.3 18.3 0 0 0-5.49 0 12.6 12.6 0 0 0-.62-1.25 19.7 19.7 0 0 0-4.88 1.52C.53 9.05-.32 13.58.1 18.06a19.9 19.9 0 0 0 5.99 3.03c.46-.63.87-1.3 1.23-1.99-.66-.25-1.28-.55-1.87-.9l.37-.29c3.93 1.79 8.18 1.79 12.06 0l.37.3c-.6.35-1.22.64-1.87.89.36.7.78 1.36 1.23 1.99a19.8 19.8 0 0 0 6-3.03c.5-5.18-.84-9.68-3.55-13.66ZM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42Z" />
    </svg>
  )
}
