/**
 * A player's name with the small "#1234" marker the server adds when two players share a Steam name (the database keeps names
 * unique, so the second "7" is stored as "7#7452"). The name stays as the player wrote it; the marker is dim and smaller.
 */
const MARKED = /^(.+?)#(\d{4}|\d{8})$/

export function splitPlayerName(username: string): { name: string; marker: string | null } {
  const match = MARKED.exec(username)
  return match ? { name: match[1], marker: `#${match[2]}` } : { name: username, marker: null }
}

export function PlayerNameText({ name }: { name: string }) {
  const { name: base, marker } = splitPlayerName(name)
  return marker ? <>{base}<span className="ml-1 text-[0.75em] font-medium text-[var(--text-faint)]">{marker}</span></> : <>{name}</>
}
