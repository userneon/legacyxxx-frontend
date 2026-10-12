import { useState } from "react"
import { Clapperboard, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { creatorsService, CREATOR_PLATFORMS, type Creator, type CreatorInput, type CreatorLinks, type CreatorTier } from "@/api/creators"
import { CreatorBadge } from "@/pages/creators"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

const input = "h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:border-[var(--text-faint)] focus:outline-none"
const secondary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:opacity-50"

type Draft = { steamId: string; tier: CreatorTier; bio: string; links: CreatorLinks }
const EMPTY: Draft = { steamId: "", tier: "creator", bio: "", links: {} }

/** Staff → Creators: Owners and Managers add a player as Main Content Creator or Content Creator, with a line and their channels. */
export function StaffCreators() {
  const { data, loading, error, refetch } = useApiQuery((signal) => creatorsService.list({ signal }), { queryKey: "staff-creators" })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!draft) return
    if (!/^7656119\d{10}$/.test(draft.steamId.trim())) { toast.error("Enter the player's SteamID64 (7656119…)"); return }
    setBusy(true)
    try {
      const body: CreatorInput = { tier: draft.tier, bio: draft.bio.trim(), links: Object.fromEntries(Object.entries(draft.links).filter(([, url]) => url?.trim()).map(([key, url]) => [key, url!.trim()])) }
      const result = await creatorsService.save(draft.steamId.trim(), body)
      toast.success(`Saved as ${result.label}`)
      setDraft(null)
      refetch()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not save the creator")
    } finally {
      setBusy(false)
    }
  }
  const remove = async (creator: Creator) => {
    setBusy(true)
    try {
      await creatorsService.remove(creator.steamId)
      toast.success(`${creator.username} is no longer a creator`)
      refetch()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not remove the creator")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-5 max-md:px-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-[var(--text-muted)]">Creators get a badge on their profile and a place on the Creators page. No staff permissions. Owners and Managers can change this list.</p>
        {!draft && <button type="button" onClick={() => setDraft(EMPTY)} className="lx-primary-button inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold"><Plus className="size-4" />Add creator</button>}
      </div>

      {draft && (
        <section aria-label="Creator" className="lx-add-box flex flex-col gap-3 rounded-2xl border p-[18px]">
          <div className="flex items-center gap-2.5"><span className="lx-add-icon"><Clapperboard className="size-4" /></span><span className="flex flex-col"><span className="text-[15px] font-semibold text-[var(--text)]">{data?.creators.some((creator) => creator.steamId === draft.steamId) ? "Edit creator" : "Add creator"}</span><span className="text-xs text-[var(--text-dim)]">Badge on the profile and a card on Creators.</span></span></div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">SteamID64
              <input className={input} value={draft.steamId} onChange={(event) => setDraft({ ...draft, steamId: event.target.value })} placeholder="7656119…" inputMode="numeric" />
            </label>
            <div className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Role
              <div role="radiogroup" className="flex h-9 gap-0.5 rounded-lg border border-[var(--line)] p-[3px]">
                {(["main", "creator"] as const).map((tier) => (
                  <button key={tier} type="button" role="radio" aria-checked={draft.tier === tier} onClick={() => setDraft({ ...draft, tier })} className={cn("rounded-md px-3 text-[13px] transition-colors", draft.tier === tier ? "bg-[var(--line)] text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]")}>
                    {tier === "main" ? "Main Content Creator" : "Content Creator"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">One line about them ({200 - draft.bio.length} left)
            <input className={input} maxLength={200} value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} placeholder="CS2 streams every evening" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {CREATOR_PLATFORMS.map((platform) => (
              <label key={platform.id} className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">{platform.label}
                <input className={input} value={draft.links[platform.id] ?? ""} onChange={(event) => setDraft({ ...draft, links: { ...draft.links, [platform.id]: event.target.value } })} placeholder={platform.example} />
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDraft(null)} className={secondary}>Cancel</button>
            <button type="button" disabled={busy} onClick={() => void save()} className="lx-primary-button inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-semibold disabled:opacity-50">Save</button>
          </div>
        </section>
      )}

      {loading && !data ? (
        <div className="flex flex-col gap-2" aria-hidden="true">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-14 rounded-xl bg-[var(--card-surface)]" />)}</div>
      ) : error && !data ? (
        <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load the creators.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
      ) : (data?.creators.length ?? 0) === 0 ? (
        <p className="py-10 text-center text-[13px] text-[var(--text-dim)]">No creators yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data!.creators.map((creator) => (
            <li key={creator.userId} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--card-surface)] px-4 py-3">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13px] font-semibold text-[var(--text)]">{creator.username}</span>
                <span className="truncate text-xs text-[var(--text-dim)]">{creator.steamId}{creator.bio ? ` · ${creator.bio}` : ""}</span>
              </span>
              <CreatorBadge tier={creator.tier} label={creator.label} />
              <button type="button" aria-label={`Edit ${creator.username}`} onClick={() => setDraft({ steamId: creator.steamId, tier: creator.tier, bio: creator.bio, links: creator.links })} className={cn(secondary, "w-9 px-0")}><Pencil className="size-4" /></button>
              <button type="button" aria-label={`Remove ${creator.username}`} disabled={busy} onClick={() => void remove(creator)} className={cn(secondary, "w-9 px-0")}><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
