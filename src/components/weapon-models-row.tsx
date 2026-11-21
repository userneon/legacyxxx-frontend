import { useState } from "react"
import { Check, Lock } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { cosmeticsService, type Cosmetics, type FrameItem } from "@/api/cosmetics"
import { ModelArt, type ModelKindId } from "@/components/model-art"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

const LISTS = {
  model_knife: { list: "modelKnives", worn: "equippedModelKnife", title: "Knife models" },
  model_deagle: { list: "modelDeagles", worn: "equippedModelDeagle", title: "Desert Eagle models" },
  model_ak47: { list: "modelAk47s", worn: "equippedModelAk47", title: "AK-47 models" },
} as const

/** Which model kind a Skinchanger weapon takes (owner 2026-11-21: the custom models are picked beside the skins, not in Appearance). */
export function modelKindFor(category: string, weaponClass: string | null | undefined): ModelKindId | null {
  if (category === "knife") return "model_knife"
  if (category !== "weapon") return null
  if (weaponClass === "Desert Eagle") return "model_deagle"
  if (weaponClass === "AK-47") return "model_ak47"
  return null
}

/**
 * The custom models of one weapon, in the same picker as its skins. The ones you own have a coloured edge and a tick when worn (a tap wears or
 * takes off); the ones you do not own are locked, and a tap takes you to that product in the Shop.
 */
export function WeaponModelsRow({ kind }: { kind: ModelKindId }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, refetch } = useApiQuery<Cosmetics>((signal) => cosmeticsService.getMine({ signal }), { queryKey: user ? `cosmetics:${user.id}` : "cosmetics:guest" })
  const [busy, setBusy] = useState<string | null>(null)
  const spec = LISTS[kind]
  const items = ((data?.[spec.list] as FrameItem[] | undefined) ?? []).filter((item) => !item.retired)
  if (!data || items.length === 0) return null
  const wornId = (data[spec.worn] as string | null | undefined) ?? null
  const wear = async (item: FrameItem) => {
    setBusy(item.id)
    try {
      await cosmeticsService.equip(kind, wornId === item.id ? null : item.id)
      await refetch()
    } catch {
      toast.error("Could not change it")
    } finally {
      setBusy(null)
    }
  }
  return (
    <section aria-label={spec.title} className="border-b border-border px-3 py-3">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--text-dim)]">{spec.title}</h3>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const owned = Boolean(item.owned)
          const worn = wornId === item.id
          return (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                disabled={busy === item.id}
                onClick={() => (owned ? void wear(item) : navigate(`/shop?item=${encodeURIComponent(item.id)}`, { state: { tab: "model" } }))}
                aria-label={owned ? `${worn ? "Take off" : "Wear"} ${item.name}` : `${item.name} is locked: see it in the Shop`}
                aria-pressed={owned ? worn : undefined}
                className={cn(
                  "relative flex w-[132px] flex-col overflow-hidden rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60",
                  owned ? "border-[var(--brand)]/70 bg-[color-mix(in_oklab,var(--brand)_12%,var(--panel))] hover:border-[var(--brand-bright)]" : "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--line-strong)]",
                )}
              >
                <span className={cn("block aspect-video w-full overflow-hidden", !owned && "opacity-45 grayscale")}><ModelArt item={item} kind={kind} mode="fill" /></span>
                <span className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-[var(--text)]"><span className="min-w-0 flex-1 truncate">{item.name}</span>{worn && <Check className="size-3.5 shrink-0 text-[var(--status-green)]" aria-hidden="true" />}</span>
                {!owned && <span className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-[var(--text-2)]"><Lock className="size-3.5" aria-hidden="true" /></span>}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
