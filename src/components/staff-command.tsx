import { useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"

import { searchService } from "@/api/search"
import type { CommunityPlayer } from "@/api/types"
import { PlayerAvatar } from "@/components/player-avatar"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const STEAM_ID = /^7656119\d{10}$/

/**
 * Staff's find box (Ctrl K): type a name or a Steam ID, move with the arrow keys, Enter opens that player's case.
 * A 17-digit Steam ID is always offered, even for someone who never signed in; names come from the same search the Explore page uses.
 */
export function StaffCommand({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (open: boolean) => void; onPick: (steamId: string) => void }) {
  const [text, setText] = useState("")
  const [players, setPlayers] = useState<CommunityPlayer[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const query = text.trim()
  const isId = STEAM_ID.test(query)

  useEffect(() => {
    if (!open) { setText(""); setPlayers([]); setActive(0); setFailed(false) }
  }, [open])

  useEffect(() => {
    if (!open || query.length < 2 || isId) { setPlayers([]); setLoading(false); setFailed(false); return }
    const controller = new AbortController()
    setLoading(true)
    const timer = window.setTimeout(() => {
      searchService.searchPlayers(query, { signal: controller.signal })
        .then((result) => { setPlayers(result.players.filter((player) => player.steamId).slice(0, 8)); setFailed(false); setActive(0) })
        .catch((error: unknown) => { if ((error as { name?: string } | null)?.name !== "AbortError") { setPlayers([]); setFailed(true) } })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 220)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [open, query, isId])

  const items: Array<{ steamId: string; title: string; sub: string; avatar?: string }> = isId
    ? [{ steamId: query, title: "Open the case", sub: query }]
    : players.map((player) => ({ steamId: player.steamId!, title: player.name, sub: `${player.steamId}${player.moderationStatus !== "Clear" ? ` · ${player.moderationStatus}` : ""}`, avatar: player.avatar }))

  const choose = (index: number) => {
    const item = items[index]
    if (!item) return
    onOpenChange(false)
    onPick(item.steamId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="top-[18%] max-w-[560px] translate-y-0 gap-0 overflow-hidden rounded-2xl p-0" onOpenAutoFocus={(event) => { event.preventDefault(); input.current?.focus() }}>
        <DialogTitle className="sr-only">Find a player</DialogTitle>
        <DialogDescription className="sr-only">Type a name or a 17-digit Steam ID, then press Enter.</DialogDescription>
        <label className="flex h-14 items-center gap-3 border-b border-[var(--line)] px-4">
          <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
          <input
            ref={input}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(value + 1, Math.max(items.length - 1, 0))) }
              else if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(value - 1, 0)) }
              else if (event.key === "Enter") { event.preventDefault(); choose(active) }
            }}
            aria-label="Find a player"
            placeholder="A name or a Steam ID"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]"
          />
          <kbd className="rounded-md border border-[var(--line)] px-1.5 py-0.5 text-[10px] text-[var(--text-dim)]">Esc</kbd>
        </label>
        <div className="max-h-[340px] overflow-y-auto" role="listbox" aria-label="Players">
          {items.map((item, index) => (
            <button
              key={item.steamId}
              type="button"
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(index)}
              className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors", index === active ? "bg-[var(--raised)]" : "hover:bg-[var(--raised)]")}
            >
              <PlayerAvatar avatar={item.avatar ?? ""} name={item.title} className="size-8 shrink-0 rounded-lg text-[11px]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-[var(--text)]">{item.title}</span>
                <span className="block truncate font-mono text-[11px] text-[var(--text-dim)]">{item.sub}</span>
              </span>
              {index === active && <kbd className="rounded-md border border-[var(--line)] px-1.5 py-0.5 text-[10px] text-[var(--text-dim)]">Enter</kbd>}
            </button>
          ))}
          {items.length === 0 && (
            <p className="px-4 py-6 text-[13px] text-[var(--text-dim)]">
              {query.length < 2 ? "Type at least 2 letters of a name, or paste a 17-digit Steam ID." : loading ? "Searching…" : failed ? "The search did not answer. Try again." : "Nobody has that name. A Steam ID always works."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
