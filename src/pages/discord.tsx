/** The LEGACY-X Discord: how to join, how to link your account, and what the server's bot does. Live counts only when the server widget is on. */
import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight, Link2, Mic, Scale, ScrollText, Search, ShieldAlert, Trophy, Megaphone } from "lucide-react"
import { toast } from "sonner"

import { discordService, type DiscordLinkState } from "@/api/discord"
import { DiscordIcon, useDiscordWidget } from "@/components/discord-strip"
import { PageBar, PageBarEnd } from "@/components/page-tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { LINKS } from "@/lib/links"
import { cn } from "@/lib/utils"

/* Discord's own blue is the brand of the invite button only; the rest of the page is the site's neutral look. */
const joinButton = "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#4752c4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7289DA]" /* palette-exempt: Discord brand */
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
        <PageBarEnd>
          <a href={widget?.instant_invite || LINKS.discordInvite} target="_blank" rel="noreferrer" className={joinButton}>
            <DiscordIcon className="size-4" />
            Join the Discord
            <ArrowUpRight className="size-3.5" />
          </a>
        </PageBarEnd>
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
              {!isAuthenticated ? "Sign in with Steam first, then link Discord." : link.loading && !link.data ? "Checking…" : link.data?.link ? `Linked as ${link.data.link.discordName}.` : "Your rank role, the Booster badge and your place on Leaders → Boosters need it."}
            </p>
          </div>
          {!isAuthenticated ? null : link.loading && !link.data ? (
            <Skeleton className="h-10 w-32 rounded-lg" />
          ) : link.data?.link ? (
            <Link to="/leaders?sort=boosters" className="inline-flex h-10 items-center rounded-lg border border-[var(--line)] bg-[var(--raised)] px-4 text-[13px] font-semibold text-[var(--text-2)] hover:border-[var(--line-strong)]">See Boosters</Link>
          ) : (
            <button type="button" disabled={busy || link.data?.available === false} onClick={() => void startLink()} className="lx-primary-button inline-flex h-10 items-center rounded-lg px-5 text-[13px] font-semibold disabled:opacity-60">Link Discord</button>
          )}
        </section>

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
      </div>
    </div>
  )
}
