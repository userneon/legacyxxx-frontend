import { useEffect, useState, type ComponentProps } from "react"
import { ArrowUpRight } from "lucide-react"

import { DISCORD_GUILD_ID, DISCORD_INVITE_URL } from "@/lib/config"

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
  members: Array<{ id: string; avatar_url: string; channel_id?: string | null }>
}

/** Public Discord widget; null while loading, when no server ID is set or the widget is switched off. */
function useDiscordWidget() {
  const [widget, setWidget] = useState<DiscordWidget | null>(null)
  useEffect(() => {
    if (!DISCORD_GUILD_ID) return
    const controller = new AbortController()
    fetch(`https://discord.com/api/guilds/${encodeURIComponent(DISCORD_GUILD_ID)}/widget.json`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: DiscordWidget | null) => {
        if (data && typeof data.presence_count === "number") setWidget(data)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [])
  return widget
}

/** One-line Discord invite with live online and in-voice counts when the server widget is on. */
export function DiscordStrip() {
  const widget = useDiscordWidget()
  const inVoice = widget?.members.filter((member) => member.channel_id).length ?? 0

  return (
    <a
      href={widget?.instant_invite || DISCORD_INVITE_URL}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-line-soft bg-card px-4 py-3 transition-colors duration-150 hover:border-line-strong hover:bg-raised"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-line bg-raised text-text">
        <DiscordIcon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-text">LEGACY-X Discord</span>
        <span className="flex items-center gap-1.5 truncate text-xs text-text-muted">
          {widget ? (
            <>
              <span className="size-1.5 shrink-0 rounded-full bg-live" aria-hidden />
              <span className="tabular-nums">
                <span className="font-medium text-text-2">{widget.presence_count.toLocaleString()}</span> online
              </span>
              {inVoice > 0 && <span className="tabular-nums">· {inVoice} in voice</span>}
            </>
          ) : (
            "Teammates, announcements and clips"
          )}
        </span>
      </span>
      <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-line-strong bg-line-soft px-3 text-xs font-semibold text-text transition-colors duration-150 group-hover:bg-line">
        Join
        <ArrowUpRight className="size-3.5" aria-hidden />
      </span>
    </a>
  )
}
