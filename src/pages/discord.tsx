/** The LEGACY-X Discord: how to join, how to link your account, and what the server's bot does. Live counts only when the server widget is on. */
import { Reveal } from "@/components/reveal"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight, BellRing, CircleCheck, X, Link2, Mic, Scale, ScrollText, Search, ShieldAlert, Trophy, Megaphone } from "lucide-react"
import { toast } from "sonner"

import { discordService, type DiscordLinkState, type PingTopic } from "@/api/discord"
import { DiscordIcon, useDiscordWidget } from "@/components/discord-strip"
import { PageBar } from "@/components/page-tabs"
import { Switch } from "@/components/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { LINKS } from "@/lib/links"
import { cn } from "@/lib/utils"

/* Discord's own blue is the brand of the invite button only; the rest of the page is the site's neutral look. */
const joinButton = "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#4752c4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7289DA]" /* palette-exempt: Discord brand */
const LINK_RESULTS: Record<string, { ok: boolean; text: string }> = {
  linked: { ok: true, text: "Discord linked. Your rank role arrives in a moment." },
  cancelled: { ok: false, text: "Discord link cancelled." },
  expired: { ok: false, text: "That link expired. Try again." },
  failed: { ok: false, text: "Discord could not be linked. Try again." },
  unavailable: { ok: false, text: "Linking Discord is not set up yet." },
}
const card = "lx-layer rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-5"

/** What the server's bot does, in the words of its own commands. Nothing here is a number or a promise: it is the list of features. */
const FEATURES: Array<{ icon: typeof Scale; title: string; text: string }> = [
  { icon: ShieldAlert, title: "Support and appeals", text: "Open a ticket to appeal a penalty or reach staff. The bot looks up your penalty for you." },
  { icon: Megaphone, title: "Reports", text: "Report a player from the game with !report: it arrives in a staff channel." },
  { icon: Search, title: "Find players", text: "Ask for teammates with /lfg. Link your account first so people can see who you are." },
  { icon: Trophy, title: "Rank roles", text: "A linked account gets the Discord role that matches its rank." },
  { icon: Mic, title: "Voice rooms", text: "Join the hub voice channel and the bot makes a room of your own." },
  { icon: ScrollText, title: "Updates", text: "Every site and game server update is posted in the updates channel, as the commits that made it." },
]

export function DiscordPage() {
  const { isAuthenticated } = useAuth()
  const widget = useDiscordWidget()
  const inVoice = widget?.members.filter((member) => member.channel_id).length ?? 0
  const link = useApiQuery<DiscordLinkState>((signal) => discordService.getLink({ signal }), { enabled: isAuthenticated, queryKey: `discord-page-link:${isAuthenticated}` })
  const [busy, setBusy] = useState(false)
  const linked = Boolean(link.data?.link)
  const pings = useApiQuery<{ linked: boolean; topics: PingTopic[] }>((signal) => discordService.getPings({ signal }), { enabled: isAuthenticated && linked, queryKey: `discord-page-pings:${linked}`, keepPreviousData: true })
  // A switch moves at once; a refused change puts it back.
  const [flipped, setFlipped] = useState<Partial<Record<PingTopic["key"], boolean>>>({})
  const setPing = async (topic: PingTopic, enabled: boolean) => {
    setFlipped((current) => ({ ...current, [topic.key]: enabled }))
    try {
      await discordService.setPing(topic.key, enabled)
      pings.refetch()
    } catch {
      setFlipped((current) => ({ ...current, [topic.key]: !enabled }))
      toast.error("Could not save the ping", { description: "Try again in a moment." })
    }
  }

  // Coming back from Discord's consent page: say how it went once, then clean the address.
  const { refetch: refetchLink } = link
  useEffect(() => {
    const url = new URL(window.location.href)
    const result = url.searchParams.get("discord")
    if (!result) return
    const outcome = LINK_RESULTS[result]
    if (outcome) (outcome.ok ? toast.success : toast.error)(outcome.text)
    url.searchParams.delete("discord")
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
    refetchLink()
  }, [refetchLink])

  const unlink = async () => {
    if (!window.confirm("Unlink your Discord account? You lose the rank role and your pings.")) return
    setBusy(true)
    try {
      await discordService.unlink()
      toast.success("Discord unlinked")
      refetchLink()
    } catch {
      toast.error("Could not unlink Discord", { description: "Try again in a moment." })
    } finally {
      setBusy(false)
    }
  }

  const startLink = async () => {
    setBusy(true)
    try {
      const { url } = await discordService.start()
      window.location.assign(url)
    } catch {
      toast.error("Could not start the Discord link", { description: "Try again in a moment." })
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageBar>
        <span className="py-3 text-[13px] text-[var(--text-dim)]">Community server</span>
      </PageBar>

      <div className="mx-auto flex w-full max-w-[980px] flex-col gap-5 px-6 py-6 max-md:px-4">
        <section className={cn(card, "flex flex-wrap items-center gap-x-6 gap-y-4 p-6")}>
          <span className={"flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#5865F2]/15 text-[#8b95f5]" /* palette-exempt: Discord brand */}><DiscordIcon className="size-7" /></span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[26px] font-bold leading-tight text-[var(--text)]">LEGACY-X Discord</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[14px] text-[var(--text-muted)]">
              {widget ? (
                <>
                  <span className="size-1.5 rounded-full bg-[var(--status-green)]" />
                  <span><b className="font-semibold text-[var(--text)]">{widget.presence_count.toLocaleString()}</b> online</span>
                  {inVoice > 0 && <span>· {inVoice} in voice</span>}
                </>
              ) : (
                "Teammates, support, announcements and clips."
              )}
            </p>
          </div>
        </section>

        <section className={cn(card, "flex flex-wrap items-center gap-x-6 gap-y-3")} aria-label="Link your Discord">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)]"><Link2 className="size-[18px]" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-[var(--text)]">Link your Discord to your profile</h2>
            <p className="mt-0.5 text-[13px] text-[var(--text-dim)]">
              {!isAuthenticated ? "Sign in with Steam first, then link Discord." : link.loading && !link.data ? "Checking…" : link.data?.link ? `Linked as ${link.data.link.discordName}.` : "Your rank role, pings, the Booster badge and your place on Leaders → Boosters need it. You also get 50 LX once."}
            </p>
          </div>
          {!isAuthenticated ? null : link.loading && !link.data ? (
            <Skeleton className="h-10 w-32 rounded-lg" />
          ) : link.data?.link ? (
            <span className="flex shrink-0 flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-[5px] text-xs font-medium text-[var(--status-green)]"><CircleCheck className="size-3.5" />Linked</span>
              {link.data.link.inServer === true && <span className="inline-flex items-center gap-[5px] text-xs font-medium text-[var(--status-green)]"><CircleCheck className="size-3.5" />On the server</span>}
              {link.data.link.inServer === false && <a href="#join" className="inline-flex items-center gap-[5px] text-xs font-medium text-[var(--text-muted)] underline-offset-4 hover:text-[var(--text)] hover:underline"><X className="size-3.5" />Not on the server yet: join below</a>}
              <Link to="/leaders?sort=boosters" className="inline-flex h-10 items-center rounded-lg border border-[var(--line)] bg-[var(--raised)] px-4 text-[13px] font-semibold text-[var(--text-2)] hover:border-[var(--line-strong)]">See Boosters</Link>
              <button type="button" disabled={busy} onClick={() => void unlink()} className="inline-flex h-10 items-center rounded-lg border border-[var(--line)] px-4 text-[13px] font-medium text-[var(--text-2)] hover:border-[var(--line-strong)] hover:bg-[var(--raised)] disabled:opacity-60">Unlink</button>
            </span>
          ) : (
            <button type="button" disabled={busy || link.data?.available === false} onClick={() => void startLink()} title={link.data?.available === false ? "Not set up yet" : undefined} className="lx-primary-button inline-flex h-10 items-center rounded-lg px-5 text-[13px] font-semibold disabled:opacity-60">{link.data?.available === false ? "Not set up yet" : "Link Discord"}</button>
          )}
        </section>

        {linked && (
          <Reveal>
          <section className={card} aria-label="Pings">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)]"><BellRing className="size-[18px]" /></span>
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-[var(--text)]">Pings</h2>
                <p className="text-[13px] text-[var(--text-dim)]">Switch on what you want to be pinged for. The bot gives you the role within a few minutes; switch it off and it takes it back.</p>
              </div>
            </div>
            <ul className="mt-4 grid gap-x-8 sm:grid-cols-2 sm:divide-y-0 max-sm:divide-y max-sm:divide-[var(--line-soft)]">
              {pings.loading && !pings.data
                ? Array.from({ length: 4 }, (_, index) => <li key={index} className="py-3"><Skeleton className="h-9 rounded-lg" /></li>)
                : (pings.data?.topics ?? []).map((topic) => (
                    <li key={topic.key} className="flex items-center justify-between gap-4 border-b border-[var(--line-soft)] py-3 last:border-b-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0">
                      <div className="min-w-0">
                        <div className="text-[14px] font-medium text-[var(--text)]">{topic.label}</div>
                        <div className="text-[12px] text-[var(--text-dim)]">{topic.description}</div>
                      </div>
                      <Switch label={topic.label} checked={flipped[topic.key] ?? topic.enabled} onChange={(next) => void setPing(topic, next)} />
                    </li>
                  ))}
            </ul>
            {pings.error && !pings.data && <p className="mt-3 text-[13px] text-[var(--text-dim)]">Could not load your pings. <button type="button" onClick={pings.refetch} className="text-[var(--text-2)] underline-offset-4 hover:underline">Retry</button></p>}
          </section>
          </Reveal>
        )}

        <section aria-label="What the server does">
          <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">What the server does</div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <li key={feature.title} className={cn(card, "flex gap-3 p-4")}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)]"><feature.icon className="size-4" /></span>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold text-[var(--text)]">{feature.title}</h3>
                  <p className="mt-0.5 text-[13px] text-[var(--text-dim)]">{feature.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Someone the bot has seen on the server does not need the invite. */}
        {link.data?.link?.inServer !== true && (
          <section id="join" className={cn(card, "flex flex-wrap items-center gap-x-6 gap-y-3 p-5")} aria-label="Join the Discord">
            <span className={"flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#5865F2]/15 text-[#8b95f5]" /* palette-exempt: Discord brand */}><DiscordIcon className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-[var(--text)]">{link.data?.link?.inServer === false ? "You are not on the server" : "Not on the server yet?"}</h2>
              <p className="text-[13px] text-[var(--text-dim)]">{link.data?.link ? "Your account is linked, but it is not on the server." : "Join first, then link your account above."}</p>
            </div>
            <a href={widget?.instant_invite || LINKS.discordInvite} target="_blank" rel="noreferrer" className={joinButton}>
              <DiscordIcon className="size-4" />
              Join the Discord
              <ArrowUpRight className="size-3.5" />
            </a>
          </section>
        )}
      </div>
    </div>
  )
}
