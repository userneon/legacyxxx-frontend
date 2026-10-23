import { useEffect, useRef, useState } from "react"
import { Check, Search, X } from "lucide-react"

import { rosterService, type RosterPlayer } from "@/api/moderation"
import { PlayerAvatar } from "@/components/player-avatar"
import { cn } from "@/lib/utils"

const STEAM_ID = /^7656119\d{10}$/

/**
 * Staff pick a player from the roster instead of typing a SteamID (owner request 2026-10-23): the players who were active last are listed
 * at once, typing a name narrows them, and a pasted 17-digit Steam ID still works. `compact` shows the list as a drop-down under the box.
 */
export function PlayerPicker({ value, onChange, compact = false, label = "Player", placeholder = "Search a name or paste a Steam ID" }: { value: string; onChange: (steamId: string) => void; compact?: boolean; label?: string; placeholder?: string }) {
  const [text, setText] = useState("")
  const [players, setPlayers] = useState<RosterPlayer[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(!compact)
  const known = useRef(new Map<string, RosterPlayer>())
  const box = useRef<HTMLDivElement>(null)
  const query = text.trim()
  const isId = STEAM_ID.test(query)

  useEffect(() => {
    if (value) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      rosterService.list(isId ? "" : query, { signal: controller.signal })
        .then((rows) => { rows.forEach((row) => known.current.set(row.steamId, row)); setPlayers(rows); setFailed(false) })
        .catch((error: unknown) => { if ((error as { name?: string } | null)?.name !== "AbortError") { setPlayers([]); setFailed(true) } })
    }, query ? 220 : 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [query, isId, value])

  useEffect(() => {
    if (!compact || !open) return
    const close = (event: MouseEvent) => { if (!box.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [compact, open])

  const pick = (steamId: string) => { onChange(steamId); setText(""); setOpen(!compact) }

  if (value) {
    const player = known.current.get(value)
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 py-2" aria-label={label}>
        <PlayerAvatar avatar={player?.avatar} name={player?.name ?? value} className="size-9 shrink-0 rounded-[10px] text-xs" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-semibold text-[var(--text)]">{player?.name ?? "Player"}</span>
          <span className="truncate font-mono text-[11px] text-[var(--text-dim)]">{value}</span>
        </span>
        <button type="button" onClick={() => onChange("")} aria-label="Choose another player" className="grid size-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--card-surface)] hover:text-[var(--text)]"><X className="size-4" /></button>
      </div>
    )
  }

  const list = (
    <ul role="listbox" aria-label="Players" className={cn("grid max-h-56 gap-1 overflow-y-auto", compact ? "rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1.5 shadow-lg" : "sm:grid-cols-2")}>
      {isId && (
        <li><button type="button" onClick={() => pick(query)} className="flex w-full items-center gap-2.5 rounded-lg border border-[var(--line)] px-2.5 py-2 text-left text-[13px] text-[var(--text)] transition-colors hover:bg-[var(--raised)]"><Check className="size-4 text-[var(--status-green)]" />Use Steam ID <span className="font-mono text-[11px] text-[var(--text-dim)]">{query}</span></button></li>
      )}
      {!isId && players === null && <li className="px-2.5 py-2 text-xs text-[var(--text-dim)]">Loading…</li>}
      {!isId && failed && <li className="px-2.5 py-2 text-xs text-[var(--text-dim)]">Could not load the players. Paste a Steam ID instead.</li>}
      {!isId && !failed && players?.length === 0 && <li className="px-2.5 py-2 text-xs text-[var(--text-dim)]">{query ? "No player has that name." : "No players yet."}</li>}
      {!isId && (players ?? []).map((player) => (
        <li key={player.steamId}>
          <button type="button" role="option" aria-selected={false} onClick={() => pick(player.steamId)} className="flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-1.5 text-left transition-colors hover:border-[var(--line)] hover:bg-[var(--raised)]">
            <PlayerAvatar avatar={player.avatar} name={player.name} className="size-8 shrink-0 rounded-lg text-[11px]" />
            <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-[13px] text-[var(--text)]">{player.name}</span><span className="text-[11px] text-[var(--text-dim)]">Level {player.level}</span></span>
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <div ref={box} className={cn("flex flex-col gap-2", compact && "relative")}>
      <label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 transition-[border-color] focus-within:border-[var(--text-faint)]">
        <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
        <input value={text} onFocus={() => setOpen(true)} onChange={(event) => { setText(event.target.value); setOpen(true) }} aria-label={label} placeholder={placeholder} autoComplete="off" className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]" />
      </label>
      {open && (compact ? <div className="absolute inset-x-0 top-full z-30 mt-1">{list}</div> : list)}
    </div>
  )
}
