/**
 * External Legacy-X links in one place. Each can be overridden per deployment through a
 * VITE_* variable; the Discord invite is the community server the Home page already links to.
 * A link that resolves to null renders no button at all (never a dead one).
 */
const env = import.meta.env as Record<string, string | undefined>
const read = (key: string) => env[key]?.trim() || null

const DISCORD_INVITE = read("VITE_DISCORD_INVITE_URL") ?? "https://discord.gg/legacyx"

export const LINKS = {
  discordInvite: DISCORD_INVITE,
  /** Where a player appeals a penalty (a ticket channel or the server). */
  discordAppeals: read("VITE_DISCORD_APPEALS_URL") ?? DISCORD_INVITE,
  /** Where a player reports another player. */
  discordReports: read("VITE_DISCORD_REPORTS_URL") ?? DISCORD_INVITE,
  /** Tournament announcements role/channel. */
  discordAnnouncements: read("VITE_DISCORD_ANNOUNCEMENTS_URL") ?? DISCORD_INVITE,
  /** Contacting a staff member. */
  discordStaff: read("VITE_DISCORD_STAFF_URL") ?? DISCORD_INVITE,
  serverRules: read("VITE_SERVER_RULES_URL"),
  tournamentRules: read("VITE_TOURNAMENT_RULES_URL"),
} as const

/** SteamID64 from a pasted steamcommunity.com/profiles/<id> link, or the text itself. */
export function steamIdFromInput(value: string): string {
  const trimmed = value.trim()
  const profile = /steamcommunity\.com\/profiles\/(\d{17})/i.exec(trimmed)
  if (profile) return profile[1]!
  const vanity = /steamcommunity\.com\/id\/([^/?#]+)/i.exec(trimmed)
  return vanity ? decodeURIComponent(vanity[1]!) : trimmed
}
