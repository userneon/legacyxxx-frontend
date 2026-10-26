import { useState } from "react"
import { Pencil, RotateCcw, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { staffConfigService, type CosmeticEdit, type CosmeticKindId, type CosmeticUnlock, type StaffCosmetic } from "@/api/staff-config"
import { CardIcon, STAFF_CARD, STAFF_GRID, StaffEmpty, StaffSection, type Tone } from "@/components/staff-ui"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

const input = "h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] text-[var(--text)] focus:border-[var(--text-faint)] focus:outline-none"
const secondary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:opacity-50"

const KIND_LABEL: Record<CosmeticKindId, string> = { frame: "Frames", name_color: "Name colours", name_glow: "Name glows", banner: "Banners", title: "Titles", smoke_color: "Smoke colours", grenade_trail: "Grenade trails", grenade_light: "Grenade lights", flash_effect: "Flash effects" }
const UNLOCK_LABEL: Record<CosmeticUnlock, string> = { free: "Free", coin: "LX", achievement: "Earned" }
const UNLOCK_TONE: Record<CosmeticUnlock, Tone> = { free: "green", coin: "sky", achievement: "violet" }

/** Staff → Shop → Cosmetics: price, names, how it is unlocked and on/off for every cosmetic. Art and colours stay in the code. */
export function StaffCosmetics() {
  const { data, loading, error, refetch } = useApiQuery<StaffCosmetic[]>((signal) => staffConfigService.cosmetics({ signal }), { queryKey: "staff-cosmetics" })
  const [kind, setKind] = useState<CosmeticKindId | "all">("all")
  const [edit, setEdit] = useState<{ id: string; draft: CosmeticEdit } | null>(null)
  const [busy, setBusy] = useState(false)
  const items = (data ?? []).filter((item) => kind === "all" || item.kind === kind)
  const kinds = Array.from(new Set((data ?? []).map((item) => item.kind)))

  const save = async () => {
    if (!edit) return
    setBusy(true)
    try {
      await staffConfigService.saveCosmetic(edit.id, { ...edit.draft, nameEn: edit.draft.nameEn.trim(), nameMn: edit.draft.nameMn.trim(), requirement: edit.draft.requirement.trim() })
      toast.success("Saved")
      setEdit(null)
      refetch()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not save the cosmetic")
    } finally {
      setBusy(false)
    }
  }
  const setDraft = (patch: Partial<CosmeticEdit>) => edit && setEdit({ ...edit, draft: { ...edit.draft, ...patch } })

  return (
    <StaffSection title="Cosmetics" count={data?.length} end={
      <div className="flex flex-wrap gap-1.5">
        {(["all", ...kinds] as const).map((value) => (
          <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={cn("h-8 rounded-full border px-3 text-xs transition-colors", kind === value ? "border-[var(--text)] bg-[var(--raised)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-dim)] hover:border-[var(--line-strong)] hover:text-[var(--text)]")}>{value === "all" ? "All" : KIND_LABEL[value]}</button>
        ))}
      </div>
    }>
      {edit && (
        <div className="relative lx-add-box flex flex-col gap-3 rounded-2xl border p-[18px]">
          <div className="flex items-center gap-2.5"><span className="lx-add-icon"><Sparkles className="size-4" /></span><span className="flex flex-col"><span className="text-[15px] font-semibold text-[var(--text)]">Edit cosmetic</span><span className="text-xs text-[var(--text-dim)]">{edit.id} · the picture and colours are fixed in the code.</span></span></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Name (English)<input className={input} maxLength={40} value={edit.draft.nameEn} onChange={(event) => setDraft({ nameEn: event.target.value })} /></label>
            <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Name (Mongolian)<input className={input} maxLength={40} value={edit.draft.nameMn} onChange={(event) => setDraft({ nameMn: event.target.value })} /></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">How it is unlocked
              <div role="radiogroup" aria-label="Unlock" className="grid h-9 grid-cols-3 gap-0.5 rounded-lg border border-[var(--line)] p-[3px]">
                {(["free", "coin", "achievement"] as const).map((unlock) => (
                  <button key={unlock} type="button" role="radio" aria-checked={edit.draft.unlock === unlock} onClick={() => setDraft({ unlock, price: unlock === "coin" ? edit.draft.price || 100 : 0 })} className={cn("rounded-md px-2 text-[13px] transition-colors", edit.draft.unlock === unlock ? "bg-[var(--line)] text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]")}>{UNLOCK_LABEL[unlock]}</button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Price for 30 days (LX)<input className={input} type="number" min={0} disabled={edit.draft.unlock !== "coin"} value={edit.draft.price} onChange={(event) => setDraft({ price: Math.max(0, Math.floor(Number(event.target.value) || 0)) })} /><span className="text-[11px] text-[var(--text-faint)]">1 day costs 25% of this, 7 days 60%, forever 300%.</span></label>
            <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Order in the list<input className={input} type="number" value={edit.draft.sort} onChange={(event) => setDraft({ sort: Math.floor(Number(event.target.value) || 0) })} /></label>
          </div>
          <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Line for earned items (how to get it)<input className={input} maxLength={80} value={edit.draft.requirement} onChange={(event) => setDraft({ requirement: event.target.value })} /></label>
          <label className="flex items-center gap-2 text-[13px] text-[var(--text-2)]"><input type="checkbox" checked={edit.draft.enabled} onChange={(event) => setDraft({ enabled: event.target.checked })} />On sale / shown in the Shop</label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEdit(null)} className={secondary}>Cancel</button>
            <button type="button" disabled={busy || edit.draft.nameEn.trim().length < 2 || edit.draft.nameMn.trim().length < 2 || (edit.draft.unlock === "coin" && edit.draft.price <= 0)} onClick={() => void save()} className="lx-primary-button inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-semibold disabled:opacity-50">Save</button>
          </div>
        </div>
      )}
      {loading && !data ? (
        <div className={STAFF_GRID} aria-hidden="true">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-[130px] rounded-xl bg-[var(--glass-fill)]" />)}</div>
      ) : error && !data ? (
        <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load the cosmetics.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
      ) : items.length === 0 ? (
        <StaffEmpty>No cosmetics here.</StaffEmpty>
      ) : (
        <ul className={STAFF_GRID}>
          {items.map((item) => (
            <li key={item.id} data-tone={item.enabled ? UNLOCK_TONE[item.unlock] : undefined} className={cn(STAFF_CARD, !item.enabled && "opacity-70")}>
              <div className="flex items-start gap-3">
                <CardIcon icon={Sparkles} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[13px] font-semibold text-[var(--text)]" title={item.nameEn}>{item.nameEn}</span>
                  <span className="truncate text-xs text-[var(--text-dim)]">{item.nameMn} · {KIND_LABEL[item.kind]}</span>
                </span>
                <span className="lx-tone-text shrink-0 rounded-full border border-[color-mix(in_oklab,var(--tone)_45%,transparent)] px-2 py-0.5 text-[11px] font-semibold">{item.unlock === "coin" ? `${item.price.toLocaleString()} LX` : UNLOCK_LABEL[item.unlock]}</span>
              </div>
              <p className="text-xs text-[var(--text-dim)]">{item.owners.toLocaleString()} owner{item.owners === 1 ? "" : "s"}{item.requirement ? ` · ${item.requirement}` : ""}{item.enabled ? "" : " · off"}</p>
              <button type="button" onClick={() => setEdit({ id: item.id, draft: { nameEn: item.nameEn, nameMn: item.nameMn, unlock: item.unlock, price: item.price, requirement: item.requirement, sort: item.sort, enabled: item.enabled } })} className={cn(secondary, "mt-auto")}><Pencil className="size-4" />Edit</button>
            </li>
          ))}
        </ul>
      )}
    </StaffSection>
  )
}
