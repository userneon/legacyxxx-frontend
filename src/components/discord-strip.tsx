import { useEffect, useState, type ComponentProps } from "react"
import { ArrowUpRight } from "lucide-react"

import { discordService } from "@/api/discord"
import { useApiQuery } from "@/hooks/use-api-query"
import { Skeleton } from "@/components/ui/skeleton"
import { LINKS } from "@/lib/links"
import discord3d from "@/assets/home/discord-3d.webp"
import { cn } from "@/lib/utils"

/** Discord server ID; live counts need Server Settings → Widget → Enable Server Widget. */
const DISCORD_GUILD_ID = (import.meta.env.VITE_DISCORD_GUILD_ID as string | undefined)?.trim()

export function DiscordIcon({ className, ...props }: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" {...props}>
      <path d="M20.32 4.37A19.79 19.79 0 0 0 15.43 2.9a.07.07 0 0 0-.07.04c-.21.37-.44.85-.6 1.23a18.27 18.27 0 0 0-5.49 0c-.16-.39-.39-.86-.61-1.23a.07.07 0 0 0-.07-.04c-1.7.29-3.31.8-4.82 1.47a.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 5.99 3.03.07.07 0 0 0 .08-.03c.46-.63.87-1.29 1.22-1.99a.07.07 0 0 0-.04-.1c-.65-.25-1.27-.55-1.87-.89a.07.07 0 0 1-.01-.12l.15-.12a.07.07 0 0 1 .07-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .07.01l.15.12a.07.07 0 0 1-.01.12c-.6.34-1.22.64-1.87.89a.07.07 0 0 0-.04.1c.36.7.78 1.36 1.22 1.99a.07.07 0 0 0 .08.03 19.84 19.84 0 0 0 6-3.03.07.07 0 0 0 .03-.05c.5-5.18-.84-9.67-3.55-13.66a.07.07 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42z" />
    </svg>
  )
}

type DiscordWidget = {
  instant_invite: string | null
  presence_count: number
  members: Array<{ id: string; username: string; avatar_url: string; channel_id?: string | null }>
}

/** Public Discord widget; null while loading, when no server ID is set or the widget is switched off. */
export function useDiscordWidget() {
  const [widget, setWidget] = useState<DiscordWidget | null>(null)
  useEffect(() => {
    if (!DISCORD_GUILD_ID) return
    const controller = new AbortController()
    fetch(`https://discord.com/api/guilds/${encodeURIComponent(DISCORD_GUILD_ID)}/widget.json`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: DiscordWidget | null) => { if (data && typeof data.presence_count === "number") setWidget(data) })
      .catch(() => undefined)
    return () => controller.abort()
  }, [])
  return widget
}

/** One-line Discord invite with live online and in-voice counts when the server widget is on. */
export function DiscordStrip() {
  const widget = useDiscordWidget()
  const inVoice = widget?.members.filter((member) => member.channel_id).length ?? 0
  const faces = widget?.members.slice(0, 5) ?? []

  return (
    <a
      href={widget?.instant_invite || LINKS.discordInvite}
      target="_blank"
      rel="noreferrer"
      aria-label="Join the LEGACY-X Discord"
      className={"glass group flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors hover:border-[#5865F2]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7289DA]" /* palette-exempt: Discord brand */}
    >
      <span className={"flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#5865F2]/15 text-[#8b95f5]" /* palette-exempt: Discord brand */}>
        <DiscordIcon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">LEGACY-X Discord</div>
        <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          {widget ? (
            <>
              <span className="size-1.5 shrink-0 rounded-full bg-[var(--status-green)]" />
              <span><span className="font-medium text-foreground/80">{widget.presence_count.toLocaleString()}</span> online</span>
              {inVoice > 0 && <span>· {inVoice} in voice</span>}
            </>
          ) : (
            "Teammates, announcements and clips"
          )}
        </div>
      </div>
      {faces.length > 0 && (
        <span className="hidden -space-x-2 @xl:flex" aria-hidden="true">
          {faces.map((member) => <img key={member.id} src={member.avatar_url} alt="" className="size-7 rounded-full border-2 border-background object-cover" loading="lazy" />)}
        </span>
      )}
      <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#5865F2] px-3 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-[#4752c4]") /* palette-exempt: Discord brand */}>
        Join
        <ArrowUpRight className="size-3.5" />
      </span>
    </a>
  )
}

/** Home's Discord card (bento): the server's blue, the 3D mark, how many are online and a few of their faces (the public widget; no count when it is off). */
export function DiscordCard({ className }: { className?: string }) {
  const widget = useDiscordWidget()
  // Our own public list of members who linked Discord (the bot fills it): it still says something when the server widget is switched off.
  const { data: community, loading: communityLoading } = useApiQuery((signal) => discordService.getCommunity("boosts", { signal }), { queryKey: "home-discord-community" })
  const linked = community?.length ?? 0
  const boosting = community?.filter((entry) => entry.boosting).length ?? 0
  const faces = widget?.members.slice(0, 5).map((member) => ({ id: member.id, src: member.avatar_url })) ?? (community ?? []).filter((entry) => entry.avatar).slice(0, 5).map((entry) => ({ id: entry.discordId, src: entry.avatar }))
  return (
    <a
      href={widget?.instant_invite || LINKS.discordInvite}
      target="_blank"
      rel="noreferrer"
      aria-label="Join the LEGACY-X Discord"
      className={cn("lx-discord-card group relative flex flex-col justify-center gap-2 overflow-hidden rounded-2xl p-4 pr-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7289DA]", className) /* palette-exempt: Discord brand */}
    >
      <span className="text-sm font-semibold text-[#c7ccff]" /* palette-exempt: Discord brand */>Discord</span>
      {widget ? (
        <span className="flex items-baseline gap-2 text-[#c7ccff]" /* palette-exempt: Discord brand */>
          <span className="text-[26px] font-bold leading-none text-white">{widget.presence_count.toLocaleString()}</span>
          <span className="text-[13px]">members online</span>
        </span>
      ) : communityLoading && !community ? (
        <Skeleton className="h-7 w-32 bg-white/10" />
      ) : linked > 0 ? (
        <span className="flex items-baseline gap-2 text-[#c7ccff]" /* palette-exempt: Discord brand */>
          <span className="text-[26px] font-bold leading-none text-white">{linked.toLocaleString()}</span>
          <span className="text-[13px]">linked on LEGACY-X</span>
        </span>
      ) : (
        <span className="text-[13px] text-[#c7ccff]" /* palette-exempt: Discord brand */>Teammates, announcements and clips</span>
      )}
      {(widget ? linked > 0 : boosting > 0) && (
        <span className="text-[12px] text-[#aab1ff]" /* palette-exempt: Discord brand */>
          {widget ? `${linked.toLocaleString()} linked on LEGACY-X` : ""}{widget && boosting > 0 ? " · " : ""}{boosting > 0 ? `${boosting.toLocaleString()} boosting the server` : ""}
        </span>
      )}
      {faces.length > 0 && (
        <span className="flex items-center" aria-hidden="true">
          <span className="flex -space-x-2">
            {faces.map((face) => <img key={face.id} src={face.src} alt="" className="size-6 rounded-full border-2 border-[#2a3390] object-cover" loading="lazy" /> /* palette-exempt: Discord brand */)}
          </span>
        </span>
      )}
      <span className="mt-1 inline-flex h-9 w-fit items-center gap-1 rounded-lg bg-white px-4 text-[13px] font-semibold text-[#3340b8] transition-colors group-hover:bg-[#e8eaff]" /* palette-exempt: Discord brand */>
        Join Discord
        <ArrowUpRight className="size-3.5" />
      </span>
      <img src={discord3d} alt="" aria-hidden="true" width={96} height={96} className="pointer-events-none absolute right-3 top-1/2 h-24 w-auto -translate-y-1/2 drop-shadow-[0_10px_18px_rgba(0,0,30,0.5)] transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105" />
    </a>
  )
}
