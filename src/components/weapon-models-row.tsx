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
    <section aria-label={spec.title} className="border-b border-border px-3 pb-3 pt-2.5">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--text-dim)]">{spec.title}</h3>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2">
        {items.map((item) => {
          const owned = Boolean(item.owned)
          const worn = wornId === item.id
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={busy === item.id}
                onClick={() => (owned ? void wear(item) : navigate(`/shop?item=${encodeURIComponent(item.id)}`, { state: { tab: "model" } }))}
                aria-label={owned ? `${worn ? "Take off" : "Wear"} ${item.name}` : `${item.name} is locked: see it in the Shop`}
                aria-pressed={owned ? worn : undefined}
                className={cn(
                  "group relative flex w-full flex-col overflow-hidden rounded-lg border bg-[var(--glass-fill)] p-2 text-left transition-[border-color,box-shadow,translate] duration-300 hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(0,0,0,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60",
                  worn ? "border-[var(--text-2)]" : "border-[var(--line-soft)] hover:border-[var(--line-strong)]",
                )}
              >
                {owned && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[var(--brand-bright)]" />}
                {worn && <span className="absolute right-1.5 top-1.5 z-[1] inline-flex items-center gap-1 rounded border border-[var(--line-strong)] bg-[var(--raised)] px-1 py-px text-[9px] font-semibold uppercase text-[var(--text-2)]"><Check className="size-3" aria-hidden="true" />Worn</span>}
                <span className={cn("relative flex h-20 items-center justify-center overflow-hidden rounded-md", !owned && "opacity-50 grayscale")}><ModelArt item={item} kind={kind} mode="fill" /></span>
                {!owned && <span className="absolute left-3.5 top-3.5 flex size-6 items-center justify-center rounded-full bg-black/65 text-[var(--text-2)]"><Lock className="size-3.5" aria-hidden="true" /></span>}
                <span className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-4">{item.name}</span>
                <span className={cn("mt-0.5 truncate text-[10px]", owned ? "text-[var(--brand-bright)]" : "text-[var(--text-dim)]")}>{owned ? "Model · yours" : "Model · locked"}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
