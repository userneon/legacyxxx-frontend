import { useState } from "react"
import { RotateCcw, SlidersHorizontal } from "lucide-react"
import { toast } from "sonner"

import { staffConfigService, type SiteSetting } from "@/api/staff-config"
import { CardIcon, STAFF_BODY, STAFF_CARD, STAFF_GRID, StaffSection } from "@/components/staff-ui"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"

const field = "h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] text-[var(--text)] focus:border-[var(--text-faint)] focus:outline-none"
const secondary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:opacity-50"

/** Staff → Settings (Owner only): the numbers that used to live in the code, each with its default and range. */
export function StaffSettings({ isOwner }: { isOwner: boolean }) {
  const { data, loading, error, refetch } = useApiQuery<SiteSetting[]>((signal) => staffConfigService.settings({ signal }), { enabled: isOwner, queryKey: `staff-settings:${isOwner}` })
  if (!isOwner) return <div className={STAFF_BODY}><p className="text-[13px] text-[var(--text-dim)]">Only the Owner can change the settings.</p></div>
  const groups = ["Play", "Chat", "Checks", "Creators"] as const
  return (
    <div className={STAFF_BODY}>
      <p className="text-[13px] text-[var(--text-muted)]">Numbers that decide how the site behaves. A change applies within a few seconds. A value that was changed is marked; Reset puts the default back.</p>
      {loading && !data ? (
        <div className={STAFF_GRID} aria-hidden="true">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-[170px] rounded-xl bg-[var(--glass-fill)]" />)}</div>
      ) : error && !data ? (
        <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load the settings.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
      ) : (
        groups.map((group) => (
          <StaffSection key={group} title={group}>
            <ul className={STAFF_GRID}>
              {(data ?? []).filter((setting) => setting.group === group).map((setting) => <SettingCard key={`${setting.key}:${setting.value}`} setting={setting} onSaved={refetch} />)}
            </ul>
          </StaffSection>
        ))
      )}
    </div>
  )
}

function SettingCard({ setting, onSaved }: { setting: SiteSetting; onSaved: () => void }) {
  const [text, setText] = useState(String(setting.value))
  const [busy, setBusy] = useState(false)
  const number = Number(text)
  const valid = text.trim() !== "" && Number.isInteger(number) && number >= setting.min && number <= setting.max
  const save = async (value: number | null) => {
    setBusy(true)
    try {
      await staffConfigService.saveSetting(setting.key, value)
      toast.success(value === null ? `${setting.label}: back to ${setting.def}` : `${setting.label}: ${value} ${setting.unit}`)
      onSaved()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not save the setting")
    } finally {
      setBusy(false)
    }
  }
  return (
    <li data-tone={setting.changed ? "amber" : undefined} className={STAFF_CARD}>
      <div className="flex items-start gap-3">
        <CardIcon icon={SlidersHorizontal} />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-[var(--text)]">{setting.label}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-dim)]">{setting.hint}</span>
        </span>
        {setting.changed && <span className="lx-tone-text shrink-0 rounded-full border border-[color-mix(in_oklab,var(--tone)_45%,transparent)] px-2 py-0.5 text-[11px] font-semibold">Changed</span>}
      </div>
      <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Value ({setting.min}–{setting.max} {setting.unit})
        <input className={field} type="number" inputMode="numeric" min={setting.min} max={setting.max} value={text} onChange={(event) => setText(event.target.value)} aria-invalid={!valid} />
      </label>
      <div className="mt-auto flex items-center gap-2">
        <button type="button" disabled={busy || !valid || number === setting.value} onClick={() => void save(number)} className="lx-primary-button inline-flex h-9 flex-1 items-center justify-center rounded-lg px-3.5 text-[13px] font-semibold disabled:opacity-50">Save</button>
        {setting.changed && <button type="button" disabled={busy} onClick={() => void save(null)} className={secondary}>Reset to {setting.def}</button>}
      </div>
    </li>
  )
}
