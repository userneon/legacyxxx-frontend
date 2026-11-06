import { useEffect, useMemo, useState } from "react"
import { Gauge, Lock, RotateCcw, Search, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { gameRolesService, type CommandLimit, type GameMode, type GameRoleSettings, type GameRoleView } from "@/api/game-roles"
import { STAFF_BODY } from "@/components/staff-ui"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

const MODE_LABEL: Record<GameMode, string> = { "5x5": "5x5 Matches", pro: "Pro League", fun: "Fun" }
const field = "h-9 w-[110px] rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] text-[var(--text)] focus:border-[var(--text-faint)] focus:outline-none"
/** The limits that count: on a command the role has, with something set. */
const liveLimits = (settings: GameRoleSettings) => Object.fromEntries(Object.entries(settings.limits ?? {}).filter(([name, limit]) => settings.commands.includes(name) && (limit.cooldown > 0 || limit.perMap > 0)).sort(([a], [b]) => a.localeCompare(b)))
const same = (a: GameRoleSettings, b: GameRoleSettings) => JSON.stringify([[...a.commands].sort(), [...a.extraFlags].sort(), [...a.modes].sort(), a.immunity, liveLimits(a)]) === JSON.stringify([[...b.commands].sort(), [...b.extraFlags].sort(), [...b.modes].sort(), b.immunity, liveLimits(b)])
const pick = (role: GameRoleView): GameRoleSettings => ({ commands: role.commands, extraFlags: role.extraFlags, modes: role.modes, immunity: role.immunity, limits: role.limits ?? {} })
const limitText = (limit: CommandLimit | undefined) => (!limit || (limit.cooldown === 0 && limit.perMap === 0) ? "" : [limit.cooldown > 0 ? `${limit.cooldown} s apart` : "", limit.perMap > 0 ? `${limit.perMap} per map` : ""].filter(Boolean).join(" · "))
const wholeIn = (value: string, max: number) => Math.max(0, Math.min(max, Math.round(Number(value) || 0)))

/** Staff → Roles (Owner only): what each in-game role may do, and on which kinds of server. The Owner role is fixed and is not listed. */
export function StaffRoles({ isOwner }: { isOwner: boolean }) {
  const { data, loading, error, refetch } = useApiQuery((signal) => gameRolesService.list({ signal }), { enabled: isOwner, queryKey: `staff-game-roles:${isOwner}` })
  const [chosen, setChosen] = useState<string>("creator")
  if (!isOwner) return <div className={STAFF_BODY}><p className="text-[13px] text-[var(--text-dim)]">Only the Owner can change the roles.</p></div>
  const role = data?.roles.find((entry) => entry.role === chosen) ?? data?.roles[0] ?? null
  return (
    <div className={STAFF_BODY}>
      <p className="max-w-3xl text-[13px] text-[var(--text-muted)]">What each in-game role may run, how often, and on which kinds of server it works. The game servers read a change within a minute. The Owner role is fixed and always has everything. Commands that change the server itself or the permissions cannot be given to any role.</p>
      {loading && !data ? (
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]"><Skeleton className="h-[320px] rounded-xl bg-[var(--glass-fill)]" /><Skeleton className="h-[520px] rounded-xl bg-[var(--glass-fill)]" /></div>
      ) : error && !data ? (
        <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load the roles.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-4" aria-hidden="true" />Retry</button></p>
      ) : data && role ? (
        <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <ul role="tablist" aria-label="Roles" className="flex gap-2 overflow-x-auto lg:flex-col">
            {data.roles.map((entry) => (
              <li key={entry.role} className="lg:w-full max-lg:shrink-0">
                <button type="button" role="tab" aria-selected={entry.role === role.role} onClick={() => setChosen(entry.role)} className={cn("flex w-full flex-col gap-1 rounded-xl border px-3.5 py-3 text-left transition-colors", entry.role === role.role ? "border-[var(--line-strong)] bg-[var(--raised)]" : "border-[var(--glass-line)] bg-[var(--glass-fill)] hover:border-[var(--line-strong)]")}>
                  <span className="flex items-center justify-between gap-2"><span className="text-[13px] font-semibold text-[var(--text)]">{entry.label}</span>{entry.changed && <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--text-dim)]">Edited</span>}</span>
                  <span className="text-[11px] text-[var(--text-dim)]">{entry.commands.length} commands · {entry.modes.length === 0 ? "Every kind of server" : entry.modes.map((mode) => MODE_LABEL[mode]).join(", ")}</span>
                </button>
              </li>
            ))}
          </ul>
          <RoleEditor key={`${role.role}:${role.updatedAt}:${role.changed}`} role={role} data={data} onSaved={refetch} />
        </div>
      ) : null}
    </div>
  )
}

function RoleEditor({ role, data, onSaved }: { role: GameRoleView; data: NonNullable<ReturnType<typeof useApiQuery<Awaited<ReturnType<typeof gameRolesService.list>>>>["data"]>; onSaved: () => void }) {
  const [draft, setDraft] = useState<GameRoleSettings>(pick(role))
  const [search, setSearch] = useState("")
  const [busy, setBusy] = useState(false)
  const [openLimit, setOpenLimit] = useState<string | null>(null)
  useEffect(() => { setDraft(pick(role)) }, [role])
  const dirty = !same(draft, pick(role))
  const atBuiltIn = same(draft, role.builtIn)
  const chosenSet = useMemo(() => new Set(draft.commands), [draft.commands])
  const groups = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = data.commands.filter((command) => !term || command.name.includes(term) || command.summary.toLowerCase().includes(term) || command.group.toLowerCase().includes(term))
    const byGroup = new Map<string, typeof list>()
    for (const command of list) byGroup.set(command.group, [...(byGroup.get(command.group) ?? []), command])
    return Array.from(byGroup.entries())
  }, [data.commands, search])
  const toggle = (name: string) => setDraft((current) => ({ ...current, commands: current.commands.includes(name) ? current.commands.filter((entry) => entry !== name) : [...current.commands, name] }))
  const toggleGroup = (names: string[], on: boolean) => setDraft((current) => ({ ...current, commands: on ? Array.from(new Set([...current.commands, ...names])) : current.commands.filter((entry) => !names.includes(entry)) }))
  const toggleMode = (mode: GameMode) => setDraft((current) => ({ ...current, modes: current.modes.includes(mode) ? current.modes.filter((entry) => entry !== mode) : [...current.modes, mode] }))
  const toggleFlag = (flag: string) => setDraft((current) => ({ ...current, extraFlags: current.extraFlags.includes(flag) ? current.extraFlags.filter((entry) => entry !== flag) : [...current.extraFlags, flag] }))
  const setLimit = (name: string, patch: Partial<CommandLimit>) => setDraft((current) => ({ ...current, limits: { ...current.limits, [name]: { ...(current.limits[name] ?? { cooldown: 0, perMap: 0 }), ...patch } } }))
  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true)
    try {
      await work()
      toast.success(done)
      onSaved()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not save the role")
    } finally {
      setBusy(false)
    }
  }
  const immunityOk = Number.isInteger(draft.immunity) && draft.immunity >= 0 && draft.immunity <= 900
  return (
    <section aria-label={role.label} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[var(--line-soft)] px-4 py-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)]"><ShieldCheck className="size-[18px]" aria-hidden="true" /></span>
        <div className="flex min-w-0 flex-1 flex-col"><h2 className="text-[15px] font-semibold text-[var(--text)]">{role.label}</h2><span className="text-[11px] text-[var(--text-dim)]">{draft.commands.length} of {data.commands.filter((command) => !command.locked).length} commands</span></div>
        <button type="button" disabled={busy || (!role.changed && atBuiltIn)} onClick={() => (role.changed ? void run(() => gameRolesService.reset(role.role), `${role.label} is back to the built-in role`) : setDraft(role.builtIn))} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] hover:border-[var(--line-strong)] disabled:opacity-50"><RotateCcw className="size-4" aria-hidden="true" />Back to built-in</button>
      </header>

      <div className="flex flex-col gap-6 px-4 py-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold text-[var(--text)]">Where it works</h3>
          <p className="text-[12px] leading-snug text-[var(--text-dim)]">Pick the kinds of server this role gets its commands on. Pick none for every kind. A server whose kind is not known gives a limited role nothing.</p>
          <div role="group" aria-label="Kinds of server" className="flex flex-wrap gap-2">
            <span className={cn("inline-flex h-8 items-center rounded-full border px-3 text-[12px]", draft.modes.length === 0 ? "border-[var(--text-2)] bg-[var(--raised)] font-semibold text-[var(--text)]" : "border-[var(--line)] text-[var(--text-dim)]")}>Every kind</span>
            {data.modes.map((mode) => <button key={mode} type="button" aria-pressed={draft.modes.includes(mode)} onClick={() => toggleMode(mode)} className="inline-flex h-8 items-center rounded-full border border-[var(--line)] px-3 text-[12px] text-[var(--text-dim)] transition-colors hover:border-[var(--line-strong)] aria-pressed:border-[var(--text-2)] aria-pressed:bg-[var(--raised)] aria-pressed:font-semibold aria-pressed:text-[var(--text)]">{MODE_LABEL[mode]}</button>)}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold text-[var(--text)]">Immunity</h3>
          <p className="text-[12px] leading-snug text-[var(--text-dim)]">A player can only be targeted by someone with more immunity. The Owner has 1000; ordinary players 0.</p>
          <input type="number" min={0} max={900} step={10} value={draft.immunity} onChange={(event) => setDraft((current) => ({ ...current, immunity: Number(event.target.value) }))} aria-label="Immunity" aria-invalid={!immunityOk} className={field} />
          {!immunityOk && <p className="text-[12px] text-[var(--status-red)]">A whole number from 0 to 900.</p>}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-[13px] font-semibold text-[var(--text)]">Commands</h3>
            <label className="ml-auto flex h-9 w-full max-w-[260px] items-center gap-2 rounded-lg border border-[var(--line)] px-3 focus-within:border-[var(--text-faint)] sm:w-[260px]">
              <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a command" aria-label="Find a command" className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none" />
            </label>
          </div>
          {groups.length === 0 && <p className="text-[13px] text-[var(--text-dim)]">No command matches.</p>}
          {groups.map(([group, commands]) => {
            const grantable = commands.filter((command) => !command.locked).map((command) => command.name)
            const all = grantable.length > 0 && grantable.every((name) => chosenSet.has(name))
            return (
              <div key={group} className="flex flex-col gap-1.5 rounded-lg border border-[var(--line-soft)]">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--line-soft)] px-3 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">{group}</span>
                  {grantable.length > 0 && <button type="button" onClick={() => toggleGroup(grantable, !all)} className="text-[12px] text-[var(--text-dim)] underline underline-offset-2 hover:text-[var(--text)]">{all ? "None of these" : "All of these"}</button>}
                </div>
                <ul className="grid gap-x-4 px-3 pb-2 sm:grid-cols-2">
                  {commands.map((command) => (
                    <li key={command.name} className="min-w-0">
                      <div className="flex items-start gap-1">
                        <label className={cn("flex min-w-0 flex-1 items-start gap-2.5 py-1.5 text-[13px]", command.locked ? "cursor-not-allowed opacity-55" : "cursor-pointer")}>
                          <Checkbox checked={chosenSet.has(command.name)} disabled={command.locked} onCheckedChange={() => toggle(command.name)} className="mt-0.5" aria-label={command.name} />
                          <span className="flex min-w-0 flex-col"><span className="flex items-center gap-1.5 font-medium text-[var(--text)]">!{command.name}{command.locked && <Lock className="size-3 text-[var(--text-dim)]" aria-label="Owner only" />}</span>{command.summary && <span className="text-[11px] leading-snug text-[var(--text-dim)]">{command.summary}</span>}</span>
                        </label>
                        {chosenSet.has(command.name) && !command.locked && (
                          <button type="button" onClick={() => setOpenLimit(openLimit === command.name ? null : command.name)} aria-expanded={openLimit === command.name} aria-label={`Limit for !${command.name}`} title={limitText(draft.limits[command.name]) || "Set a limit"} className={cn("mt-1 inline-flex h-6 shrink-0 items-center gap-1 rounded-md border px-1.5 text-[11px] transition-colors hover:border-[var(--line-strong)]", limitText(draft.limits[command.name]) ? "border-[var(--text-2)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-dim)]")}>
                            <Gauge className="size-3" aria-hidden="true" />{limitText(draft.limits[command.name]) || "Limit"}
                          </button>
                        )}
                      </div>
                      {openLimit === command.name && chosenSet.has(command.name) && (
                        <div className="mb-1.5 ml-6 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--line-soft)] bg-[var(--bg)] p-2.5">
                          <label className="flex flex-col gap-1 text-[11px] text-[var(--text-dim)]">Wait between uses (seconds)
                            <input type="number" min={0} max={3600} step={1} value={draft.limits[command.name]?.cooldown ?? 0} onChange={(event) => setLimit(command.name, { cooldown: wholeIn(event.target.value, 3600) })} className={cn(field, "h-8 w-[110px]")} />
                          </label>
                          <label className="flex flex-col gap-1 text-[11px] text-[var(--text-dim)]">Most uses per map
                            <input type="number" min={0} max={999} step={1} value={draft.limits[command.name]?.perMap ?? 0} onChange={(event) => setLimit(command.name, { perMap: wholeIn(event.target.value, 999) })} className={cn(field, "h-8 w-[110px]")} />
                          </label>
                          <span className="pb-1.5 text-[11px] text-[var(--text-faint)]">0 means no limit.</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold text-[var(--text)]">Other permissions</h3>
          <p className="text-[12px] leading-snug text-[var(--text-dim)]">Read by other plugins on the server, not commands of the admin plugin.</p>
          <ul className="flex flex-col">
            {data.extraFlags.map((entry) => (
              <li key={entry.flag}><label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[13px]"><Checkbox checked={draft.extraFlags.includes(entry.flag)} onCheckedChange={() => toggleFlag(entry.flag)} aria-label={entry.label} /><span className="text-[var(--text)]">{entry.label}</span><span className="text-[11px] text-[var(--text-dim)]">{entry.flag}</span></label></li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--line-soft)] bg-[var(--panel)] px-4 py-3">
        {dirty && <span role="status" className="mr-auto inline-flex items-center gap-1.5 text-[12px] text-[var(--text-2)]"><span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--accent-solid)]" />Not saved yet</span>}
        <button type="button" disabled={!dirty || busy} onClick={() => setDraft(pick(role))} className="inline-flex h-10 items-center rounded-lg border border-[var(--line)] bg-[var(--raised)] px-4 text-[13px] text-[var(--text-2)] hover:border-[var(--line-strong)] disabled:opacity-50">Discard</button>
        <button type="button" disabled={!dirty || busy || !immunityOk} onClick={() => void run(() => gameRolesService.save(role.role, { ...draft, limits: liveLimits(draft) }), `${role.label} saved`)} className="lx-primary-button inline-flex h-10 items-center rounded-lg px-5 text-[13px] font-semibold disabled:opacity-50">{busy ? "Saving…" : "Save role"}</button>
      </footer>
    </section>
  )
}
