/**
 * External links used across the site. Each can be overridden per deployment with a VITE_* variable; the
 * defaults point at the community Discord.
 */
const env = import.meta.env as Record<string, string | undefined>
const pick = (name: string, fallback: string) => env[name]?.trim() || fallback

export const DISCORD_INVITE_URL = pick("VITE_DISCORD_INVITE_URL", "https://discord.gg/legacyx")
/** Where a penalized player appeals (a ticket channel or form). */
export const DISCORD_APPEALS_URL = pick("VITE_DISCORD_APPEALS_URL", DISCORD_INVITE_URL)
/** Where "Report player" sends people. */
export const DISCORD_REPORT_URL = pick("VITE_DISCORD_REPORT_URL", DISCORD_INVITE_URL)
/** Tournament announcements role/channel ("Get notified on Discord"). */
export const DISCORD_ANNOUNCEMENTS_URL = pick("VITE_DISCORD_ANNOUNCEMENTS_URL", DISCORD_INVITE_URL)
/** Staff contact on the owner/staff profile card. */
export const DISCORD_STAFF_CONTACT_URL = pick("VITE_DISCORD_STAFF_CONTACT_URL", DISCORD_INVITE_URL)
export const SERVER_RULES_URL = pick("VITE_SERVER_RULES_URL", DISCORD_INVITE_URL)
export const TOURNAMENT_RULES_URL = pick("VITE_TOURNAMENT_RULES_URL", SERVER_RULES_URL)
/** Discord server ID for the public widget (live online counts on Home). */
export const DISCORD_GUILD_ID = env.VITE_DISCORD_GUILD_ID?.trim() || null
