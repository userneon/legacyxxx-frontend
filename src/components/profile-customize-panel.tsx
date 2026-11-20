/**
 * Profile → Appearance → Name (owner request 2026-11-14; the banner picture moved to the Banner tab 2026-11-20): the name as Normal (a colour), Gradient (two colours) or Glow, in the site font or one of two more,
 * and the player's own banner picture. It needs the Shop's "Profile customize" to be running; without it the panel says so and points to the Shop.
 * Everything is saved through the API, which checks the colours, the fonts and the picture again.
 */
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ImagePlus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { cosmeticsService, PROFILE_BANNER_RULES, profileBannerProblem, type Cosmetics, type ProfileLook } from "@/api/cosmetics"
import { clanArtSrc } from "@/api/clans"
import { ColorRow, PICK_COLORS } from "@/components/color-row"
import { nameProps } from "@/lib/cosmetics"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

const MODES: Array<{ value: ProfileLook["mode"]; label: string }> = [{ value: "normal", label: "Normal" }, { value: "gradient", label: "Gradient" }, { value: "glow", label: "Glow" }]
const FONTS: Array<{ value: ProfileLook["font"]; label: string }> = [{ value: "default", label: "Default" }, { value: "display", label: "Display" }, { value: "mono", label: "Mono" }]
const START: ProfileLook = { mode: "normal", font: "default", color: null, color2: null, glow: null }

export function ProfileCustomizePanel({ data, onChanged }: { data: Cosmetics; onChanged: () => Promise<void> }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const product = data.profileCustomize?.[0]
  const active = Boolean(product?.owned)
  const [look, setLook] = useState<ProfileLook>(data.profileLook ?? START)
  const [busy, setBusy] = useState(false)
  const name = user?.username ?? "Player"
  const sample = { mode: look.mode, font: look.font, color: look.color, color2: look.color2, glow: look.mode === "glow" ? look.glow : null }

  // The profile card beside this tab shows the look being tried, live.
  const previewKey = JSON.stringify({ name: { ...sample, colorFx: null, glowFx: null }, bannerImage: undefined })
  useEffect(() => {
    if (!active) return
    window.dispatchEvent(new CustomEvent("legacyx:appearance-preview", { detail: JSON.parse(previewKey) }))
    return () => { window.dispatchEvent(new CustomEvent("legacyx:appearance-preview", { detail: null })) }
  }, [previewKey, active])

  const run = async (work: () => Promise<unknown>, failure: string, success?: string) => {
    setBusy(true)
    try {
      await work()
      if (success) toast.success(success)
      await onChanged()
    } catch (caught) {
      toast.error(failure, { description: caught instanceof Error ? caught.message : "Try again in a moment." })
    } finally {
      setBusy(false)
    }
  }
  const pick = (patch: Partial<ProfileLook>) => setLook((current) => ({ ...current, ...patch }))

  if (!active) {
    return (
      <div className="lx-glass flex flex-col items-start gap-3 rounded-2xl p-5">
        <h3 className="text-[15px] font-semibold text-[var(--text)]">Profile customize is not active</h3>
        <p className="max-w-[560px] text-[13px] text-[var(--text-dim)]">Style your name (Normal, Gradient or Glow, with a choice of fonts) and upload a banner picture of your own. Get Profile customize in the Shop for 1, 7 or 30 days.</p>
        <button type="button" onClick={() => navigate("/shop/customize")} className="lx-primary-button inline-flex h-10 items-center rounded-lg px-4 text-[13px] font-semibold">Open the Shop</button>
      </div>
    )
  }

  const button = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] px-3.5 text-[13px] font-semibold text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--raised)] disabled:cursor-default disabled:opacity-60"
  return (
    <div className="flex flex-col gap-3">
      <section className="lx-glass flex flex-col gap-4 rounded-2xl p-4" aria-label="Name style">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-[var(--text)]">Name style</h3>
          <span className="text-[12px] text-[var(--text-dim)]">{product?.expiresAt ? `Active until ${new Date(product.expiresAt).toLocaleDateString()}` : "Active"}</span>
        </div>
        <div className="flex min-h-[64px] items-center justify-center rounded-xl bg-[var(--raised)] px-4 py-3">
          <span {...nameProps(sample, "max-w-full truncate text-[30px] font-bold leading-tight text-[var(--text)]")}>{name}</span>
        </div>
        <div role="radiogroup" aria-label="Style" className="flex flex-wrap gap-1.5">
          {MODES.map((entry) => (
            <button key={entry.value} type="button" role="radio" aria-checked={look.mode === entry.value} onClick={() => pick(entry.value === "gradient" ? { mode: "gradient", color: look.color ?? "#60a5fa", color2: look.color2 ?? "#e879f9" } : entry.value === "glow" ? { mode: "glow", glow: look.glow ?? "#22c55e" } : { mode: "normal" })} className={cn("inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-medium transition-colors", look.mode === entry.value ? "border-[var(--text-2)] bg-[var(--raised)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-dim)] hover:text-[var(--text)]")}>{entry.label}</button>
          ))}
        </div>
        <div className="flex flex-col gap-2.5">
          {look.mode === "normal" && <ColorRow label="Colour" value={look.color ?? "#fafafa"} colors={PICK_COLORS} onChange={(next) => pick({ color: next })} />}
          {look.mode === "gradient" && (
            <>
              <ColorRow label="From" value={look.color ?? "#60a5fa"} colors={PICK_COLORS} onChange={(next) => pick({ color: next, color2: look.color2 ?? "#e879f9" })} />
              <ColorRow label="To" value={look.color2 ?? "#e879f9"} colors={PICK_COLORS} onChange={(next) => pick({ color2: next, color: look.color ?? "#60a5fa" })} />
            </>
          )}
          {look.mode === "glow" && <ColorRow label="Glow" value={look.glow ?? "#22c55e"} colors={PICK_COLORS} onChange={(next) => pick({ glow: next })} />}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[12px] text-[var(--text-dim)]">Font</span>
          <div role="radiogroup" aria-label="Font" className="grid grid-cols-3 gap-2">
            {FONTS.map((entry) => (
              <button key={entry.value} type="button" role="radio" aria-checked={look.font === entry.value} onClick={() => pick({ font: entry.value })} className={cn("flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border transition-colors", look.font === entry.value ? "border-[var(--text-2)] bg-[var(--raised)]" : "border-[var(--line)] hover:border-[var(--line-strong)]")}>
                <span {...nameProps({ font: entry.value }, "max-w-full truncate px-2 text-[15px] font-bold text-[var(--text)]")}>{name}</span>
                <span className="text-[10px] text-[var(--text-dim)]">{entry.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || (look.mode === "glow" && !look.glow)} onClick={() => void run(() => cosmeticsService.saveProfileLook(look.mode === "glow" && !look.glow ? { ...look, glow: "#22c55e" } : look), "Could not save your name style", "Name style saved")} className="lx-primary-button inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-semibold disabled:opacity-60">Save</button>
          <button type="button" disabled={busy} onClick={() => { setLook(START); void run(() => cosmeticsService.saveProfileLook(START), "Could not reset it", "Back to a plain name") }} className={button}>Plain name</button>
        </div>
      </section>
    </div>
  )
}

/**
 * Profile → Appearance → Banner: the picture of your own, above the banner designs (owner 2026-11-20: the "Banner" tab and the "Name & banner" tab both had a banner, so it was in two places).
 * It needs Profile customize, like the name style; without it this says so and points to the Shop.
 */
export function ProfileBannerPicture({ data, onChanged }: { data: Cosmetics; onChanged: () => Promise<void> }) {
  const navigate = useNavigate()
  const active = Boolean(data.profileCustomize?.[0]?.owned)
  const [busy, setBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const bannerSrc = clanArtSrc(data.profileBanner)
  const run = async (work: () => Promise<unknown>, failure: string, success?: string) => {
    setBusy(true)
    try {
      await work()
      if (success) toast.success(success)
      await onChanged()
    } catch (caught) {
      toast.error(failure, { description: caught instanceof Error ? caught.message : "Try again in a moment." })
    } finally {
      setBusy(false)
    }
  }
  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0]
    event.target.value = ""
    if (!chosen) return
    const problem = profileBannerProblem(chosen)
    if (problem) { toast.error(problem); return }
    void run(() => cosmeticsService.uploadProfileBanner(chosen), "Could not upload the banner", "Banner saved")
  }
  const button = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] px-3.5 text-[13px] font-semibold text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:opacity-50"
  if (!active) {
    return (
      <section className="lx-glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4" aria-label="Your own banner picture">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-[15px] font-semibold text-[var(--text)]">Your own picture</h3>
          <p className="text-[12px] text-[var(--text-dim)]">Upload a banner of your own with Profile customize (the same pass that styles your name).</p>
        </div>
        <button type="button" onClick={() => navigate("/shop/customize")} className="lx-primary-button inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-semibold">Open the Shop</button>
      </section>
    )
  }
  return (
    <section className="lx-glass flex flex-col gap-3 rounded-2xl p-4" aria-label="Your own banner picture">
      <h3 className="text-[15px] font-semibold text-[var(--text)]">Your own picture</h3>
      {bannerSrc ? (
        <img src={bannerSrc} alt="Your profile banner" className="h-[120px] w-full rounded-xl object-cover" />
      ) : (
        <div className="grid h-[120px] place-items-center rounded-xl bg-[var(--raised)] text-[13px] text-[var(--text-dim)]">No picture yet: pick a design below, or upload your own</div>
      )}
      <p className="text-[12px] text-[var(--text-dim)]">{PROFILE_BANNER_RULES.hint}. Keep it clean: staff may remove a picture that breaks the rules. Your picture is shown instead of a design.</p>
      <input ref={file} type="file" accept={PROFILE_BANNER_RULES.types.join(",")} onChange={onFile} className="sr-only" aria-label="Choose a banner picture" />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => file.current?.click()} className={button}><ImagePlus className="size-4" aria-hidden="true" />{bannerSrc ? "Replace" : "Upload"}</button>
        {bannerSrc && <button type="button" disabled={busy} onClick={() => void run(() => cosmeticsService.removeProfileBanner(), "Could not remove the picture", "Picture removed")} className={button}><Trash2 className="size-4" aria-hidden="true" />Remove</button>}
      </div>
    </section>
  )
}
