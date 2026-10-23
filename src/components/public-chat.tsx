import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { MessageCircle, Send, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { chatService, type ChatMessage } from "@/api/chat"
import { FramedAvatar } from "@/components/framed-avatar"
import { useModerationAccess } from "@/components/penalty-staff"
import { formatRelativeTime } from "@/components/relative-time"
import { SteamIcon } from "@/components/steam-login-gate"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { nameProps } from "@/lib/cosmetics"
import { cn } from "@/lib/utils"

const MAX = 300

/**
 * The public chat (owner request 2026-10-23): a round button bottom right that opens the community chat. Everyone reads, a signed-in player
 * writes (no links; a short wait between messages; a gagged player cannot write), staff who can ban remove a message. The page asks for the
 * latest messages every 4 s while the panel is open and every 30 s while it is shut, to show a dot when something new was written.
 */
export function PublicChat() {
  const { user, isAuthenticated, loginWithSteam } = useAuth()
  const staff = useModerationAccess()
  const mayRemove = Boolean(staff?.can.ban)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [seen, setSeen] = useState<string | null>(null)
  // The panel stays mounted a moment after it closes so it can fade out: `present` is mounted, `shown` is the visible state it transitions to.
  const [present, setPresent] = useState(false)
  const [shown, setShown] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const introIds = useRef<Set<string> | null>(null)
  const prevCount = useRef(0)
  const { data, loading, error, refetch } = useApiQuery<ChatMessage[]>((signal) => chatService.list({ signal }), { queryKey: "public-chat", keepPreviousData: true })
  const messages = data ?? []
  const newest = messages[messages.length - 1]

  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") refetch() }, open ? 4000 : 30_000)
    return () => window.clearInterval(timer)
  }, [open, refetch])

  // Opening the panel marks what is there as read; a message of your own never lights the dot.
  useEffect(() => { if (open && newest) setSeen(newest.id) }, [open, newest])
  const unread = !open && newest !== undefined && newest.id !== seen && seen !== null && newest.author.steamId !== user?.steamId

  useEffect(() => {
    if (open) {
      setPresent(true)
      const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(() => setShown(true)))
      return () => window.cancelAnimationFrame(frame)
    }
    setShown(false)
    const timer = window.setTimeout(() => { setPresent(false); introIds.current = null }, 200)
    return () => window.clearTimeout(timer)
  }, [open])

  // Keep the bottom in view while the reader is at the bottom: at once when the panel opens, smoothly when a message arrives.
  useLayoutEffect(() => {
    const el = list.current
    if (!el || !present) { prevCount.current = 0; return }
    if (stick.current) {
      const grew = prevCount.current > 0 && messages.length > prevCount.current
      const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      if (grew && !calm) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
      else el.scrollTop = el.scrollHeight
    }
    prevCount.current = messages.length
  }, [messages.length, present])
  useEffect(() => { if (open) stick.current = true }, [open])
  useEffect(() => { if (!open && newest && seen === null) setSeen(newest.id) }, [open, newest, seen])

  const send = useCallback(async () => {
    const body = text.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      await chatService.send(body)
      setText("")
      stick.current = true
      refetch()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not send the message")
    } finally {
      setBusy(false)
    }
  }, [text, busy, refetch])

  const remove = async (message: ChatMessage) => {
    try {
      await chatService.remove(message.id)
      refetch()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not remove the message")
    }
  }

  // What was already in the chat when it opened shows at once; only messages that arrive later slide in.
  if (present && introIds.current === null && data) introIds.current = new Set(data.map((message) => message.id))

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 max-sm:bottom-3 max-sm:right-3">
      {present && (
        <section aria-label="Community chat" aria-hidden={!open} className={cn("flex h-[480px] max-h-[calc(100dvh-6rem)] w-[360px] max-w-[calc(100vw-1.5rem)] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-[var(--glass-line)] bg-[var(--panel)] shadow-[0_24px_48px_-20px_rgb(0_0_0/0.8)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none", shown && open ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-2 scale-[0.97] opacity-0")}>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--line-soft)] px-4">
            <span aria-hidden="true" className="size-2 rounded-full bg-[var(--status-green)]" />
            <h2 className="flex-1 text-[13px] font-semibold text-[var(--text)]">Community chat</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close the chat" className="grid size-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]"><X className="size-4" /></button>
          </header>
          <div
            ref={list}
            onScroll={(event) => { const el = event.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}
            className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
            aria-live="polite"
          >
            {loading && !data ? (
              <p className="m-auto text-[13px] text-[var(--text-dim)]">Loading…</p>
            ) : error && !data ? (
              <p className="m-auto flex items-center gap-2 text-[13px] text-[var(--text-dim)]">Could not load the chat.<button type="button" onClick={refetch} className="text-[var(--text-2)] underline underline-offset-4 hover:text-[var(--text)]">Retry</button></p>
            ) : messages.length === 0 ? (
              <p className="m-auto text-[13px] text-[var(--text-dim)]">No messages yet. Say hello.</p>
            ) : (
              messages.map((message) => (
                <article key={message.id} className={cn("group/msg flex gap-2.5", introIds.current && !introIds.current.has(message.id) && "animate-[lx-chat-in_200ms_ease-out_both] motion-reduce:animate-none")}>
                  <FramedAvatar avatar={message.author.avatar ?? undefined} name={message.author.name} frame={message.author.frame} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-xs">
                      <span {...nameProps(message.author.nameStyle, "truncate font-semibold text-[var(--text)]")} title={message.author.name}>{message.author.name}</span>
                      {message.author.staffRole && <span className={cn("shrink-0 rounded-full border px-1.5 text-[10px] font-semibold leading-[16px]", message.author.staffRole === "OWNER" ? "border-[var(--brand)]/45 bg-[var(--brand)]/12 text-[var(--brand-bright)]" : "border-[var(--line-strong)] text-[var(--text-2)]")}>{message.author.staffRole === "OWNER" ? "Owner" : message.author.staffRole === "MANAGER" ? "Manager" : "Admin"}</span>}
                      <span className="shrink-0 text-[11px] text-[var(--text-faint)]">{formatRelativeTime(new Date(message.createdAt))}</span>
                      {mayRemove && <button type="button" onClick={() => void remove(message)} aria-label={`Remove the message by ${message.author.name}`} title="Remove" className="ml-auto grid size-6 shrink-0 place-items-center rounded-md text-[var(--text-faint)] opacity-0 transition-[opacity,color] hover:text-[var(--status-red)] focus-visible:opacity-100 group-hover/msg:opacity-100 max-sm:opacity-100"><Trash2 className="size-3.5" /></button>}
                    </p>
                    <p className="mt-0.5 break-words text-[13px] leading-snug text-[var(--text-2)]">{message.body}</p>
                  </div>
                </article>
              ))
            )}
          </div>
          <footer className="shrink-0 border-t border-[var(--line-soft)] p-3">
            {isAuthenticated ? (
              <form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); void send() }}>
                <input value={text} maxLength={MAX} onChange={(event) => setText(event.target.value)} placeholder="Write a message" aria-label="Message" autoComplete="off" className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:border-[var(--text-faint)] focus:outline-none" />
                <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="lx-primary-button grid size-9 shrink-0 place-items-center rounded-lg disabled:opacity-50"><Send className="size-4" /></button>
              </form>
            ) : (
              <button type="button" onClick={loginWithSteam} className="lx-steam-button flex h-9 w-full items-center justify-center gap-2 rounded-lg text-xs font-semibold"><SteamIcon className="size-4 shrink-0" />Sign in with Steam to write</button>
            )}
            {isAuthenticated && text.length > MAX - 60 && <p className="mt-1.5 text-right text-[11px] text-[var(--text-dim)]">{MAX - text.length} left</p>}
          </footer>
        </section>
      )}
      <button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close the chat" : "Open the community chat"} aria-expanded={open} className="relative grid size-12 animate-[lx-chat-pop_360ms_cubic-bezier(0.22,1,0.36,1)_both] place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--card-surface)] text-[var(--text)] shadow-[0_8px_24px_-8px_rgb(0_0_0/0.8)] transition-[background-color,transform] duration-200 ease-out hover:scale-105 hover:bg-[var(--raised)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 motion-reduce:animate-none motion-reduce:transition-colors motion-reduce:hover:scale-100 motion-reduce:active:scale-100">
        <MessageCircle aria-hidden="true" className={cn("absolute size-5 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none", open ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100")} />
        <X aria-hidden="true" className={cn("absolute size-5 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none", open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0")} />
        {unread && <span aria-hidden="true" className="absolute right-0.5 top-0.5 size-3 animate-[lx-chat-ring_1.6s_ease-out_infinite] rounded-full bg-[var(--accent-solid)] motion-reduce:animate-none" />}
        {unread && <span aria-hidden="true" className="absolute right-0.5 top-0.5 size-3 rounded-full border-2 border-[var(--card-surface)] bg-[var(--accent-solid)]" />}
      </button>
    </div>
  )
}
