import { MessageSquare } from "lucide-react"

/** What an emote looks like to the site: the line other players read in the game chat when it is played with .e. */
export function EmoteArt({ name, username, compact }: { name: string; username: string; compact?: boolean }) {
  return (
    <span className="flex max-w-full flex-col items-center gap-1.5">
      <span className="inline-flex size-9 items-center justify-center rounded-[10px] border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)]"><MessageSquare className="size-[18px]" aria-hidden="true" /></span>
      {!compact && <span className="max-w-full truncate px-2 text-[11px] text-[var(--text-dim)]">{username}</span>}
      <span className="max-w-full truncate rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1 text-[13px] font-semibold text-[var(--text)]">{name}</span>
    </span>
  )
}
