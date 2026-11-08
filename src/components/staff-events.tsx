import { useState } from "react"
import { CalendarDays, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { eventsService, type EventTheme, type StaffEvent, type StaffEventInput, type StaffEventList } from "@/api/events"
import { CardIcon, STAFF_CARD, STAFF_GRID, StaffSection } from "@/components/staff-ui"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { EVENT_THEMES, eventDays } from "@/lib/site-events"

const field = "h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] text-[var(--text)] focus:border-[var(--text-faint)] focus:outline-none"
const secondary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:opacity-50"

const blank = (): StaffEventInput => ({ theme: "halloween", title: "Halloween", startsOn: "", endsOn: "", enabled: true })

/** Staff → Settings → Events (Owner only): the holidays the website, the app and the bot dress up for. The days are typed in (Tsagaan Sar moves every year). */
export function StaffEvents() {
  const { data, loading, error, refetch } = useApiQuery<StaffEventList>((signal) => eventsService.list({ signal }), { queryKey: "staff-events" })
  return (
    <StaffSection title="Holidays">
      <p className="mb-3 text-[13px] text-[var(--text-muted)]">While a holiday runs, the website, the iOS app and the Discord bot wear its look; it ends by itself after the last day. Days are Ulaanbaatar days, the first and the last both count.</p>
      <AddEvent onSaved={refetch} />
      {loading && !data ? (
        <div className={`${STAFF_GRID} mt-3`} aria-hidden="true">{[0, 1].map((index) => <Skeleton key={index} className="h-[120px] rounded-xl bg-[var(--glass-fill)]" />)}</div>
      ) : error && !data ? (
        <p className="mt-3 flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load the holidays.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
      ) : (data?.events.length ?? 0) === 0 ? (
        <p className="mt-3 text-[13px] text-[var(--text-dim)]">No holidays yet.</p>
      ) : (
        <ul className={`${STAFF_GRID} mt-3`}>
          {data!.events.map((event) => <EventCard key={`${event.id}:${event.startsOn}:${event.endsOn}:${event.enabled}`} event={event} running={event.id === data!.runningId} onChanged={refetch} />)}
        </ul>
      )}
    </StaffSection>
  )
}

function AddEvent({ onSaved }: { onSaved: () => void }) {
  const [draft, setDraft] = useState<StaffEventInput>(blank)
  const [busy, setBusy] = useState(false)
  const valid = draft.title.trim().length > 0 && Boolean(draft.startsOn) && Boolean(draft.endsOn) && draft.endsOn >= draft.startsOn
  const pick = (theme: EventTheme) => setDraft((current) => ({ ...current, theme, title: EVENT_THEMES.find((entry) => entry.id === theme)?.label ?? current.title }))
  const add = async () => {
    setBusy(true)
    try {
      await eventsService.create({ ...draft, title: draft.title.trim() })
      toast.success(`${draft.title.trim()} scheduled`)
      setDraft(blank())
      onSaved()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not save the holiday")
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className={`${STAFF_CARD} lx-add-box`}>
      <div className="flex items-center gap-3"><CardIcon icon={CalendarDays} /><span className="text-[13px] font-semibold text-[var(--text)]">Schedule a holiday</span></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Look
          <select className={field} value={draft.theme} onChange={(event) => pick(event.target.value as EventTheme)}>
            {EVENT_THEMES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Name
          <input className={field} value={draft.title} maxLength={60} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">First day
          <input className={field} type="date" value={draft.startsOn} onChange={(event) => setDraft({ ...draft, startsOn: event.target.value, endsOn: draft.endsOn || event.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Last day
          <input className={field} type="date" min={draft.startsOn || undefined} value={draft.endsOn} onChange={(event) => setDraft({ ...draft, endsOn: event.target.value })} />
        </label>
      </div>
      <div className="flex items-center justify-end">
        <button type="button" disabled={busy || !valid} onClick={() => void add()} className="lx-primary-button inline-flex h-9 items-center justify-center rounded-lg px-4 text-[13px] font-semibold disabled:opacity-50">Schedule</button>
      </div>
    </div>
  )
}

function EventCard({ event, running, onChanged }: { event: StaffEvent; running: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const label = EVENT_THEMES.find((entry) => entry.id === event.theme)?.label ?? event.theme
  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true)
    try {
      await action()
      toast.success(done)
      onChanged()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not save the holiday")
    } finally {
      setBusy(false)
    }
  }
  const toggle = () => run(() => eventsService.update(event.id, { theme: event.theme, title: event.title, startsOn: event.startsOn, endsOn: event.endsOn, enabled: !event.enabled }), event.enabled ? "Switched off" : "Switched on")
  const remove = () => {
    if (!confirm) {
      setConfirm(true)
      window.setTimeout(() => setConfirm(false), 4000)
      return
    }
    void run(() => eventsService.remove(event.id), "Deleted")
  }
  return (
    <li data-tone={running ? "green" : event.enabled ? undefined : "red"} className={STAFF_CARD}>
      <div className="flex items-start gap-3">
        <CardIcon icon={CalendarDays} />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-[var(--text)]">{event.title}</span>
          <span className="mt-0.5 block text-xs text-[var(--text-dim)]">{label} · {eventDays(event.startsOn, event.endsOn)}</span>
        </span>
        <span className="lx-tone-text shrink-0 rounded-full border border-[color-mix(in_oklab,var(--tone,var(--line-strong))_45%,transparent)] px-2 py-0.5 text-[11px] font-semibold">{running ? "Running now" : event.enabled ? "Scheduled" : "Off"}</span>
      </div>
      <div className="mt-auto flex items-center gap-2">
        <button type="button" disabled={busy} onClick={() => void toggle()} className={`${secondary} flex-1`}>{event.enabled ? "Switch off" : "Switch on"}</button>
        <button type="button" disabled={busy} onClick={remove} aria-label={confirm ? "Delete for good?" : "Delete"} className={secondary}>
          <Trash2 className="size-4" />{confirm && <span className="text-[var(--status-red)]">Delete for good?</span>}
        </button>
      </div>
    </li>
  )
}
