/**
 * A clan's links (owner request 2026-10-26): text buttons with the platform's name on the clan page, and the fields the leader fills in
 * the clan settings. The API accepts only https links on each platform's own host; a link that does not start with https is not drawn.
 */
import { ExternalLink } from "lucide-react"

import type { ClanLinkPlatform, ClanLinks } from "@/api/types"
import { BrandIcon } from "@/components/brand-icons"
import { Label } from "@/components/ui/label"

export const CLAN_LINK_PLATFORMS: Array<{ id: ClanLinkPlatform; label: string; placeholder: string }> = [
  { id: "discord", label: "Discord", placeholder: "discord.gg/yourclan" },
  { id: "facebook", label: "Facebook", placeholder: "facebook.com/yourclan" },
  { id: "youtube", label: "YouTube", placeholder: "youtube.com/@yourclan" },
  { id: "twitch", label: "Twitch", placeholder: "twitch.tv/yourclan" },
  { id: "kick", label: "Kick", placeholder: "kick.com/yourclan" },
  { id: "instagram", label: "Instagram", placeholder: "instagram.com/yourclan" },
  { id: "tiktok", label: "TikTok", placeholder: "tiktok.com/@yourclan" },
  { id: "steam", label: "Steam group", placeholder: "steamcommunity.com/groups/yourclan" },
]

/** The clan's links as buttons; nothing when it has none. */
export function ClanLinksRow({ links }: { links?: ClanLinks }) {
  const present = CLAN_LINK_PLATFORMS.filter((platform) => links?.[platform.id]?.startsWith("https://"))
  if (present.length === 0) return null
  return (
    <ul className="flex flex-wrap items-center gap-2 pt-1">
      {present.map((platform) => (
        <li key={platform.id}>
          <a
            href={links![platform.id]}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 text-[13px] font-medium text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--raised)] hover:text-[var(--text)]"
          >
            <BrandIcon platform={platform.id} className="size-4 shrink-0" />
            {platform.label}
            <ExternalLink className="size-3.5 text-[var(--text-dim)]" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  )
}

/** One field per platform, kept as text until the leader saves; an empty field means no link. */
export function ClanLinksEditor({ value, onChange }: { value: Record<ClanLinkPlatform, string>; onChange: (next: Record<ClanLinkPlatform, string>) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Links</Label>
      <p className="text-[11px] text-[var(--text-dim)]">Shown on your clan page. Each one has to be a link on that platform itself.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {CLAN_LINK_PLATFORMS.map((platform) => (
          <label key={platform.id} className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-[var(--text-dim)]">{platform.label}</span>
            <input
              value={value[platform.id]}
              maxLength={200}
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => onChange({ ...value, [platform.id]: event.target.value })}
              placeholder={platform.placeholder}
              className="h-9 w-full rounded-lg border border-[var(--line)] bg-transparent px-3 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus-visible:border-[var(--line-strong)] focus-visible:ring-1 focus-visible:ring-[var(--accent-solid)]"
            />
          </label>
        ))}
      </div>
    </div>
  )
}

/** The fields filled from what the clan has now. */
export function clanLinkFields(links?: ClanLinks): Record<ClanLinkPlatform, string> {
  return Object.fromEntries(CLAN_LINK_PLATFORMS.map((platform) => [platform.id, links?.[platform.id] ?? ""])) as Record<ClanLinkPlatform, string>
}

/** The fields as the API takes them: empty ones left out. */
export function clanLinksFromFields(fields: Record<ClanLinkPlatform, string>): ClanLinks {
  return Object.fromEntries(Object.entries(fields).map(([id, text]) => [id, text.trim()]).filter(([, text]) => text)) as ClanLinks
}
