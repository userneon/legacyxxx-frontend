/** A pasted Steam profile link or SteamID64 becomes the SteamID (or vanity name); anything else is kept as typed. */
export function normalizePlayerQuery(input: string) {
  const value = input.trim()
  const profile = /steamcommunity\.com\/profiles\/(\d{17})/i.exec(value)
  if (profile) return profile[1]
  const vanity = /steamcommunity\.com\/id\/([^/?#]+)/i.exec(value)
  if (vanity) return decodeURIComponent(vanity[1])
  return value
}

export function steamProfileUrl(steamId: string) {
  return `https://steamcommunity.com/profiles/${encodeURIComponent(steamId)}`
}
