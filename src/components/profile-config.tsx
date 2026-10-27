/**
 * The Configs tab on a profile (owner request 2026-10-27): the player's crosshair, mouse, keyboard, monitor and viewmodel, as they typed
 * them. Nothing is read from the game or guessed; a part the player left empty is not drawn. The player edits their own from here.
 */
import { useState } from "react"
import { Copy, Pencil, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { profileOverviewService, type PlayerConfig } from "@/api/profile-overview"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { copyText } from "@/components/profile-ids"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

const card = "flex flex-col gap-2 rounded-[10px] border border-[var(--glass-line)] bg-[var(--glass-fill)] p-[18px]"
const field = "h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:border-[var(--text-faint)] focus:outline-none"
const secondary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:opacity-50"

type Row = [label: string, value: string | number | undefined]

function CardHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text)]"><span className="h-3.5 w-[3px] rounded-full bg-[var(--text-faint)]" />{children}</h3>
}

function Rows({ rows }: { rows: Row[] }) {
  const shown = rows.filter((row) => row[1] !== undefined && row[1] !== "")
  if (shown.length === 0) return null
  return (
    <dl className="flex flex-col">
      {shown.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 border-t border-[var(--line-soft)] py-2 first:border-t-0 first:pt-0">
          <dt className="text-[13px] text-[var(--text-muted)]">{label}</dt>
          <dd className="min-w-0 break-words text-right text-[13px] font-medium text-[var(--text)]">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The console commands for a viewmodel, so the player's setup can be pasted straight into the game. */
function viewmodelCommands(view: NonNullable<PlayerConfig["viewmodel"]>): string {
  return ([["viewmodel_fov", view.fov], ["viewmodel_offset_x", view.offsetX], ["viewmodel_offset_y", view.offsetY], ["viewmodel_offset_z", view.offsetZ]] as Array<[string, number | undefined]>)
    .filter((pair): pair is [string, number] => typeof pair[1] === "number")
    .map(([name, value]) => `${name} ${value}`).join("; ")
}

function ConfigView({ config, isOwner, onEdit }: { config: PlayerConfig; isOwner: boolean; onEdit: () => void }) {
  const { mouse, keyboard, monitor, viewmodel, other } = config
  const commands = viewmodel ? viewmodelCommands(viewmodel) : ""
  return (
    <div className="flex flex-col gap-4">
      {isOwner && <div className="flex justify-end"><button type="button" onClick={onEdit} className={secondary}><Pencil className="size-4" aria-hidden="true" />Edit configs</button></div>}
      <div className="grid items-start gap-4 md:grid-cols-2">
        {config.crosshair && (
          <section className={card} aria-label="Crosshair">
            <CardHeading>Crosshair</CardHeading>
            <code className="break-all rounded-lg border border-[var(--line-soft)] bg-[var(--panel)] px-3 py-2 font-mono text-[13px] text-[var(--text)]">{config.crosshair}</code>
            <button type="button" onClick={async () => { if (await copyText(config.crosshair!, "Crosshair code")) toast.success("Crosshair code copied") }} className={cn(secondary, "self-start")}><Copy className="size-4" aria-hidden="true" />Copy code</button>
          </section>
        )}
        {mouse && (
          <section className={card} aria-label="Mouse">
            <CardHeading>Mouse</CardHeading>
            <Rows rows={[["Model", mouse.model], ["DPI", mouse.dpi], ["Sensitivity", mouse.sensitivity], ["Zoom sensitivity", mouse.zoomSensitivity], ["Polling rate", mouse.pollingRate ? `${mouse.pollingRate} Hz` : undefined]]} />
          </section>
        )}
        {keyboard && (
          <section className={card} aria-label="Keyboard">
            <CardHeading>Keyboard</CardHeading>
            <Rows rows={[["Model", keyboard.model]]} />
          </section>
        )}
        {monitor && (
          <section className={card} aria-label="Monitor">
            <CardHeading>Monitor</CardHeading>
            <Rows rows={[["Resolution", monitor.resolution], ["Aspect", monitor.aspect], ["Refresh rate", monitor.refreshRate ? `${monitor.refreshRate} Hz` : undefined]]} />
          </section>
        )}
        {viewmodel && (
          <section className={card} aria-label="Viewmodel">
            <CardHeading>Viewmodel</CardHeading>
            <Rows rows={[["FOV", viewmodel.fov], ["Offset X", viewmodel.offsetX], ["Offset Y", viewmodel.offsetY], ["Offset Z", viewmodel.offsetZ]]} />
            {commands && <button type="button" onClick={async () => { if (await copyText(commands, "Viewmodel commands")) toast.success("Console commands copied") }} className={cn(secondary, "self-start")}><Copy className="size-4" aria-hidden="true" />Copy console commands</button>}
          </section>
        )}
        {other && other.length > 0 && (
          <section className={card} aria-label="Other">
            <CardHeading>Other</CardHeading>
            <Rows rows={other.map((line): Row => [line.label, line.value])} />
          </section>
        )}
      </div>
    </div>
  )
}

const text = (value: string | undefined) => value ?? ""
const num = (value: number | undefined) => (value === undefined ? "" : String(value))
/** An empty or unreadable box leaves the value out. */
const parse = (value: string): number | undefined => { const trimmed = value.trim().replace(",", "."); return trimmed === "" || Number.isNaN(Number(trimmed)) ? undefined : Number(trimmed) }

function Input({ label, value, onChange, placeholder, max, inputMode }: { label: string; value: string; onChange: (next: string) => void; placeholder?: string; max?: number; inputMode?: "decimal" | "numeric" }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">{label}
      <input className={field} value={value} maxLength={max} inputMode={inputMode} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function formFrom(config: PlayerConfig | null) {
  return {
    crosshair: text(config?.crosshair), mouseModel: text(config?.mouse?.model), dpi: num(config?.mouse?.dpi), sens: num(config?.mouse?.sensitivity), zoom: num(config?.mouse?.zoomSensitivity), polling: num(config?.mouse?.pollingRate),
    keyboard: text(config?.keyboard?.model), resolution: text(config?.monitor?.resolution), aspect: text(config?.monitor?.aspect), refresh: num(config?.monitor?.refreshRate),
    fov: num(config?.viewmodel?.fov), ox: num(config?.viewmodel?.offsetX), oy: num(config?.viewmodel?.offsetY), oz: num(config?.viewmodel?.offsetZ),
    other: (config?.other ?? []).map((line) => ({ ...line })),
  }
}
type Form = ReturnType<typeof formFrom>

function ConfigEditor({ config, open, onOpenChange, onSaved }: { config: PlayerConfig | null; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState<Form>(() => formFrom(config))
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }))
  const setLine = (index: number, patch: Partial<Form["other"][number]>) => set("other", form.other.map((entry, at) => (at === index ? { ...entry, ...patch } : entry)))

  const save = async () => {
    setBusy(true)
    try {
      await profileOverviewService.saveConfig({
        crosshair: form.crosshair.trim(),
        mouse: { model: form.mouseModel.trim(), dpi: parse(form.dpi), sensitivity: parse(form.sens), zoomSensitivity: parse(form.zoom), pollingRate: parse(form.polling) },
        keyboard: { model: form.keyboard.trim() },
        monitor: { resolution: form.resolution.trim(), aspect: form.aspect.trim(), refreshRate: parse(form.refresh) },
        viewmodel: { fov: parse(form.fov), offsetX: parse(form.ox), offsetY: parse(form.oy), offsetZ: parse(form.oz) },
        other: form.other.filter((line) => line.label.trim() && line.value.trim()).map((line) => ({ label: line.label.trim(), value: line.value.trim() })),
      })
      toast.success("Your configs are saved")
      onOpenChange(false)
      onSaved()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not save your configs")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (busy) return; if (next) setForm(formFrom(config)); onOpenChange(next) }}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto bg-[var(--panel)] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Your configs</DialogTitle>
          <DialogDescription>Shown on your profile for everyone. Leave a box empty to leave it out.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          <Input label="Crosshair share code" value={form.crosshair} onChange={(next) => set("crosshair", next)} placeholder="CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx" max={40} />
          <fieldset className="grid grid-cols-2 gap-3"><legend className="mb-2 text-[13px] font-semibold text-[var(--text)]">Mouse</legend>
            <div className="col-span-2"><Input label="Model" value={form.mouseModel} onChange={(next) => set("mouseModel", next)} max={60} /></div>
            <Input label="DPI" value={form.dpi} onChange={(next) => set("dpi", next)} inputMode="numeric" placeholder="800" />
            <Input label="Sensitivity" value={form.sens} onChange={(next) => set("sens", next)} inputMode="decimal" placeholder="1.2" />
            <Input label="Zoom sensitivity" value={form.zoom} onChange={(next) => set("zoom", next)} inputMode="decimal" placeholder="1" />
            <Input label="Polling rate (Hz)" value={form.polling} onChange={(next) => set("polling", next)} inputMode="numeric" placeholder="1000" />
          </fieldset>
          <fieldset className="grid grid-cols-2 gap-3"><legend className="mb-2 text-[13px] font-semibold text-[var(--text)]">Keyboard and monitor</legend>
            <div className="col-span-2"><Input label="Keyboard model" value={form.keyboard} onChange={(next) => set("keyboard", next)} max={60} /></div>
            <Input label="Resolution" value={form.resolution} onChange={(next) => set("resolution", next)} placeholder="1920x1080" max={20} />
            <Input label="Aspect" value={form.aspect} onChange={(next) => set("aspect", next)} placeholder="16:9" max={10} />
            <Input label="Refresh rate (Hz)" value={form.refresh} onChange={(next) => set("refresh", next)} inputMode="numeric" placeholder="240" />
          </fieldset>
          <fieldset className="grid grid-cols-2 gap-3"><legend className="mb-2 text-[13px] font-semibold text-[var(--text)]">Viewmodel</legend>
            <Input label="FOV (54 to 68)" value={form.fov} onChange={(next) => set("fov", next)} inputMode="decimal" placeholder="68" />
            <Input label="Offset X (-2.5 to 2.5)" value={form.ox} onChange={(next) => set("ox", next)} inputMode="decimal" />
            <Input label="Offset Y (-2 to 2)" value={form.oy} onChange={(next) => set("oy", next)} inputMode="decimal" />
            <Input label="Offset Z (-2 to 2)" value={form.oz} onChange={(next) => set("oz", next)} inputMode="decimal" />
          </fieldset>
          <fieldset className="flex flex-col gap-2"><legend className="mb-2 text-[13px] font-semibold text-[var(--text)]">Other</legend>
            {form.other.map((line, index) => (
              <div key={index} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
                <input aria-label="Label" className={field} maxLength={30} placeholder="Launch options" value={line.label} onChange={(event) => setLine(index, { label: event.target.value })} />
                <input aria-label="Value" className={field} maxLength={100} placeholder="-novid -high" value={line.value} onChange={(event) => setLine(index, { value: event.target.value })} />
                <button type="button" aria-label="Remove line" onClick={() => set("other", form.other.filter((_, at) => at !== index))} className={cn(secondary, "px-3")}>×</button>
              </div>
            ))}
            {form.other.length < 10 && <button type="button" onClick={() => set("other", [...form.other, { label: "", value: "" }])} className={cn(secondary, "self-start")}>Add a line</button>}
          </fieldset>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} disabled={busy} className={secondary}>Cancel</button>
          <button type="button" disabled={busy} onClick={() => void save()} className="lx-primary-button inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold disabled:opacity-50">Save</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ProfileConfigs({ userId, isOwner }: { userId: string; isOwner: boolean }) {
  const { data, loading, error, refetch } = useApiQuery((signal) => profileOverviewService.getConfig(userId, { signal }), { queryKey: `profile-config:${userId}` })
  const [editing, setEditing] = useState(false)
  if (loading) return <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-[150px] rounded-[10px]" />)}</div>
  if (error || !data) {
    return <div role="alert" className="flex items-center gap-3 text-[13px] text-[var(--text-muted)]">Could not load the configs.<button type="button" onClick={() => void refetch()} className={secondary}><RotateCcw className="size-4" aria-hidden="true" />Retry</button></div>
  }
  return (
    <>
      {data.config ? <ConfigView config={data.config} isOwner={isOwner} onEdit={() => setEditing(true)} /> : (
        <div className="flex flex-wrap items-center gap-3 text-[13px] text-[var(--text-dim)]">
          {isOwner ? "You have not added your configs yet." : "This player has not shared their configs."}
          {isOwner && <button type="button" onClick={() => setEditing(true)} className={secondary}><Pencil className="size-4" aria-hidden="true" />Add your configs</button>}
        </div>
      )}
      {isOwner && <ConfigEditor config={data.config} open={editing} onOpenChange={setEditing} onSaved={() => void refetch()} />}
    </>
  )
}
