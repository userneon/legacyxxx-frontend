import { PlayerAvatar } from "@/components/player-avatar"
import type { ModerationStatus } from "@/api/types"

/**
 * A player's avatar where moderation context matters (penalty lists, drawers). The status itself
 * is written out next to it (type / status columns), so the avatar stays plain — no coloured ring.
 */
export function PlayerModerationAvatar({ avatar, name, className }: { avatar?: string; name: string; status?: ModerationStatus; className?: string }) {
  return <PlayerAvatar avatar={avatar} name={name} className={className} />
}
