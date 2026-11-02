import { useState } from "react"
import { Check, Plus, RotateCcw, X } from "lucide-react"

import { ColorRow, PICK_COLORS } from "@/components/color-row"
import { ColorPicker } from "@/components/color-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cleanBgLook, type BgControl, type BgDef, type BgLook } from "@/lib/backgrounds"
import { cn } from "@/lib/utils"

const chip = (active: boolean) => cn("inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium capitalize transition-colors", active ? "border-[var(--text-2)] bg-[var(--raised)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-dim)] hover:border-[var(--line-strong)] hover:text-[var(--text)]")

const shown = (value: number, step: number) => (step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : value.toLocaleString())

/**
 * Every knob of a React Bits background, as it has them on its own page: sliders, switches, colours, colour lists and options, made from the
 * component's own props (src/lib/backgrounds.generated.ts). `draft` holds only what the player changed, over the component's own defaults.
 */
export function BgCustomizer({ def, draft, onDraft, saved, owned, busy, onSave }: { def: BgDef; draft: BgLook; onDraft: (next: BgLook) => void; saved: BgLook | null; owned: boolean; busy: boolean; onSave: (look: BgLook) => void }) {
  const clean = cleanBgLook(def, draft)
  const changed = JSON.stringify(clean) !== JSON.stringify(cleanBgLook(def, saved ?? {}))
  const set = (key: string, value: BgLook[string] | undefined) => {
    const next = { ...draft }
    if (value === undefined) delete next[key]
    else next[key] = value
    onDraft(next)
  }
  const [all, setAll] = useState(false)
  const controls = all ? def.controls : def.controls.slice(0, 14)

  return (
    <div className="flex flex-col gap-4 rounded-[10px] border border-[var(--line-soft)] bg-[var(--panel)] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-[var(--text)]">{def.name}</h3>
        <span className="text-[11px] text-[var(--text-dim)]">{def.controls.length} settings</span>
      </div>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {controls.map((control) => <Knob key={control.key} control={control} value={clean[control.key]} onChange={(value) => set(control.key, value)} />)}
      </div>
      {def.controls.length > 14 && (
        <button type="button" onClick={() => setAll(!all)} className="self-start text-xs text-[var(--text-dim)] underline underline-offset-2 hover:text-[var(--text)]">{all ? "Fewer settings" : `All ${def.controls.length} settings`}</button>
      )}
      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex flex-wrap items-center gap-2 rounded-b-[10px] border-t border-[var(--line-soft)] bg-[var(--panel)] px-4 py-3">
        <button type="button" disabled={busy || !owned || !changed} onClick={() => onSave(clean)} className="lx-primary-button inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold disabled:opacity-50"><Check className="size-4" aria-hidden="true" />Save my background</button>
        <button type="button" disabled={busy} onClick={() => onDraft(cleanBgLook(def, saved ?? {}))} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] hover:border-[var(--line-strong)] disabled:opacity-50"><RotateCcw className="size-4" aria-hidden="true" />Undo changes</button>
        <button type="button" disabled={busy} onClick={() => onDraft({})} className="inline-flex h-9 items-center rounded-lg px-3 text-[13px] text-[var(--text-dim)] hover:text-[var(--text)] disabled:opacity-50">Defaults</button>
        {owned && changed && <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-2)]"><span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--accent-solid)]" />Not saved yet</span>}
        {!owned && <span className="text-xs text-[var(--text-dim)]">Try everything now. Your settings are saved the moment you buy it.</span>}
      </div>
    </div>
  )
}

function Knob({ control, value, onChange }: { control: BgControl; value: BgLook[string] | undefined; onChange: (value: BgLook[string] | undefined) => void }) {
  if (control.type === "number") {
    const current = typeof value === "number" ? value : control.default
    return (
      <label className="flex flex-col gap-1">
        <span className="flex items-center justify-between text-[12px] text-[var(--text-muted)]">{control.label}<span className="text-[var(--text)]">{shown(current, control.step)}</span></span>
        <input type="range" min={control.min} max={control.max} step={control.step} value={current} onChange={(event) => onChange(Number(event.target.value))} className="h-2 w-full cursor-pointer accent-[var(--text-2)]" />
      </label>
    )
  }
  if (control.type === "boolean") {
    const current = typeof value === "boolean" ? value : control.default
    return (
      <label className="inline-flex cursor-pointer items-center gap-2 self-end text-[13px] text-[var(--text-2)]">
        <input type="checkbox" checked={current} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[var(--text-2)]" />
        {control.label}
      </label>
    )
  }
  if (control.type === "color") {
    const current = typeof value === "string" ? value : control.default ?? "#8b5cf6"
    return <ColorRow label={control.label} value={current.toLowerCase().slice(0, 7)} colors={PICK_COLORS} original={control.default} onChange={onChange} />
  }
  if (control.type === "select") {
    const current = typeof value === "string" ? value : control.default
    return (
      <div role="group" aria-label={control.label} className="flex flex-wrap items-center gap-1.5 sm:col-span-2">
        <span className="w-[110px] shrink-0 text-[12px] text-[var(--text-dim)]">{control.label}</span>
        {control.options.map((option) => <button key={option} type="button" aria-pressed={current === option} onClick={() => onChange(option)} className={chip(current === option)}>{option}</button>)}
      </div>
    )
  }
  // A list of colours (up to eight): the component's own until the player sets some.
  const list = Array.isArray(value) ? value : null
  return (
    <div role="group" aria-label={control.label} className="flex flex-wrap items-center gap-2 sm:col-span-2">
      <span className="w-[110px] shrink-0 text-[12px] text-[var(--text-dim)]">{control.label}</span>
      {list ? (
        <>
          {list.map((color, index) => (
            <span key={index} className="relative">
              <Popover>
                <PopoverTrigger asChild><button type="button" aria-label={`Colour ${index + 1}`} className="size-7 rounded-full border border-[var(--line-strong)]" style={{ background: color }} /></PopoverTrigger>
                <PopoverContent align="start" className="w-auto rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] p-3"><ColorPicker value={color.toLowerCase().slice(0, 7)} onChange={(next) => onChange(list.map((entry, at) => (at === index ? next : entry)))} /></PopoverContent>
              </Popover>
              {list.length > 1 && <button type="button" aria-label={`Remove colour ${index + 1}`} onClick={() => onChange(list.filter((_, at) => at !== index))} className="absolute -right-1 -top-1 grid size-3.5 place-items-center rounded-full bg-[var(--panel)] text-[var(--text-dim)] ring-1 ring-[var(--line-strong)] hover:text-[var(--text)]"><X className="size-2.5" /></button>}
            </span>
          ))}
          {list.length < 8 && <button type="button" aria-label="Add a colour" onClick={() => onChange([...list, list[list.length - 1] ?? "#8b5cf6"])} className="grid size-7 place-items-center rounded-full border border-dashed border-[var(--line-strong)] text-[var(--text-dim)] hover:text-[var(--text)]"><Plus className="size-3.5" /></button>}
          <button type="button" onClick={() => onChange(undefined)} className="text-xs text-[var(--text-dim)] underline underline-offset-2 hover:text-[var(--text)]">Default</button>
        </>
      ) : (
        <button type="button" onClick={() => onChange(control.default && control.default.length ? control.default : ["#8b5cf6", "#a78bfa"])} className={chip(false)}>{control.default?.length ? "Default colours · edit" : "Set colours"}</button>
      )}
    </div>
  )
}
