import { useState } from "react"
import { Link } from "react-router-dom"
import { Check, RotateCcw } from "lucide-react"

import { ColorRow, PICK_COLORS } from "@/components/color-row"
import { OrbAvatar } from "@/components/orb-avatar"
import { ORB_MOTIONS, ORB_PRESETS, ORB_SHAPES, ORB_SLIDERS, resolveLook, type FrameLook } from "@/lib/frame-look"
import { cn } from "@/lib/utils"

const chip = (active: boolean) => cn("inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium capitalize transition-colors", active ? "border-[var(--text-2)] bg-[var(--raised)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-dim)] hover:border-[var(--line-strong)] hover:text-[var(--text)]")

/**
 * Every knob of the Crystal Orb, as on the React Bits page it comes from (owner request 2026-11-01): preset, motion, particle shape,
 * colour, the sliders and the switches. Anyone can play with it; saving needs the frame. What is picked is kept as the player's own
 * values on top of the preset's, and changing the preset starts again from that preset.
 */
export function OrbCustomizer({ avatar, name, owned, saved, busy, onSave, draft: controlled, onDraft, showPreview = true }: { avatar?: string; name?: string; owned: boolean; saved: FrameLook | null; busy: boolean; onSave: (look: FrameLook) => void; draft?: FrameLook; onDraft?: (look: FrameLook) => void; showPreview?: boolean }) {
  // Alone it keeps its own draft; the Shop hands it the draft its preview already shows (controlled), so what is changed moves in that preview.
  const [own, setOwn] = useState<FrameLook>(saved ?? {})
  const [more, setMore] = useState(false)
  const draft = controlled ?? own
  const setDraft = (next: FrameLook) => (onDraft ?? setOwn)(next)
  const shown = resolveLook(draft)
  const set = (patch: FrameLook) => setDraft({ ...draft, ...patch })
  const changed = JSON.stringify(draft) !== JSON.stringify(saved ?? {})

  return (
    <div className="flex flex-col gap-4 rounded-[10px] border border-[var(--line-soft)] bg-[var(--panel)] p-4">
      {showPreview && (
        <div className="flex flex-col items-center gap-2">
          <OrbAvatar avatar={avatar} name={name} size={200} look={draft} />
          <p className="text-[11px] text-[var(--text-dim)]">Move the pointer over it. Everything below changes it live.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Group label="Preset">
          {ORB_PRESETS.map((preset) => <button key={preset} type="button" aria-pressed={shown.preset === preset} onClick={() => setDraft({ preset })} className={chip(shown.preset === preset)}>{preset}</button>)}
        </Group>
        <Group label="Motion">
          {ORB_MOTIONS.map((motion) => <button key={motion} type="button" aria-pressed={shown.motion === motion} onClick={() => set({ motion })} className={chip(shown.motion === motion)}>{motion}</button>)}
        </Group>
        <Group label="Particle shape">
          {ORB_SHAPES.map((particleShape) => <button key={particleShape} type="button" aria-pressed={shown.particleShape === particleShape} onClick={() => set({ particleShape })} className={chip(shown.particleShape === particleShape)}>{particleShape}</button>)}
        </Group>
        <ColorRow label="Color" value={shown.color.toLowerCase()} colors={PICK_COLORS} onChange={(color) => set({ color })} />
      </div>

      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {(more ? ORB_SLIDERS : ORB_SLIDERS.slice(0, 6)).map((slider) => {
          const value = shown[slider.key as keyof typeof shown] as number
          return (
            <label key={slider.key} className="flex flex-col gap-1">
              <span className="flex items-center justify-between text-[12px] text-[var(--text-muted)]">{slider.label}<span className="text-[var(--text)]">{slider.step < 1 ? value.toFixed(slider.step < 0.1 ? 2 : 1) : value.toLocaleString()}</span></span>
              <input type="range" min={slider.min} max={slider.max} step={slider.step} value={value} onChange={(event) => set({ [slider.key]: Number(event.target.value) } as FrameLook)} className="h-2 w-full cursor-pointer accent-[var(--text-2)]" />
            </label>
          )
        })}
      </div>

      {more && (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Toggle label="Interactive" checked={shown.interactive} onChange={(interactive) => set({ interactive })} />
          <Toggle label="Intro" checked={shown.intro} onChange={(intro) => set({ intro })} />
        </div>
      )}
      <button type="button" onClick={() => setMore(!more)} className="self-start text-xs text-[var(--text-dim)] underline underline-offset-2 hover:text-[var(--text)]">{more ? "Fewer settings" : `All ${ORB_SLIDERS.length + 2} settings`}</button>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line-soft)] pt-3">
        <button type="button" disabled={busy || !owned || !changed} onClick={() => onSave(draft)} className="lx-primary-button inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold disabled:opacity-50"><Check className="size-4" aria-hidden="true" />Save my orb</button>
        <button type="button" disabled={busy} onClick={() => setDraft(saved ?? {})} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] hover:border-[var(--line-strong)] disabled:opacity-50"><RotateCcw className="size-4" aria-hidden="true" />Undo changes</button>
        {!owned && <span className="text-xs text-[var(--text-dim)]">Try everything now. Your settings are saved the moment you buy the orb in the <Link to="/shop/frames" className="text-[var(--text-2)] underline underline-offset-2">Shop</Link>.</span>}
      </div>
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="w-[96px] shrink-0 text-[12px] text-[var(--text-dim)]">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-[var(--text-2)]">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[var(--text-2)]" />
      {label}
    </label>
  )
}
