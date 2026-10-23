import { useState } from "react"
import { Check, Clapperboard, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { creatorsService, CREATOR_PLATFORMS, type Creator, type StaffCreatorApplication, type CreatorInput, type CreatorLinks, type CreatorTier } from "@/api/creators"
import { CreatorBadge, CreatorLinks as CreatorLinkButtons } from "@/pages/creators"
import { PlayerAvatar } from "@/components/player-avatar"
import { STAFF_BODY, STAFF_CARD, STAFF_GRID, StaffEmpty, StaffSection } from "@/components/staff-ui"
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
  const applications = useApiQuery((signal) => creatorsService.applications({ signal }), { queryKey: "staff-creator-applications" })
  const answer = async (application: StaffCreatorApplication, decision: "approve" | "decline", tier: CreatorTier, note: string) => {
    setBusy(true)
    try {
      await creatorsService.decide(application.id, { decision, tier, note: note.trim() })
      toast.success(decision === "approve" ? `${application.player.username} is now a creator` : "Application declined")
      applications.refetch()
      if (decision === "approve") refetch()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not save the answer")
      applications.refetch()
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
    <div className={STAFF_BODY}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-[var(--text-muted)]">Creators get a badge and a card on the Creators page.</p>
        {!draft && <button type="button" onClick={() => setDraft(EMPTY)} className="lx-primary-button inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold"><Plus className="size-4" />Add creator</button>}
      </div>

      {draft && (
        <section aria-label="Creator" className="relative lx-add-box flex flex-col gap-3 rounded-2xl border p-[18px]">
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

      {(applications.data?.applications.length ?? 0) > 0 && (
        <StaffSection title="Applications" count={applications.data!.applications.length}>
          <ul className={STAFF_GRID}>
            {applications.data!.applications.map((application) => <ApplicationRow key={application.id} application={application} busy={busy} onAnswer={answer} />)}
          </ul>
        </StaffSection>
      )}

      <StaffSection title="Creators" count={data?.creators.length}>
        {loading && !data ? (
          <div className={STAFF_GRID} aria-hidden="true">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-[150px] rounded-xl bg-[var(--glass-fill)]" />)}</div>
        ) : error && !data ? (
          <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load the creators.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
        ) : (data?.creators.length ?? 0) === 0 ? (
          <StaffEmpty>No creators yet.</StaffEmpty>
        ) : (
          <ul className={STAFF_GRID}>
            {data!.creators.map((creator) => (
              <li key={creator.userId} className={STAFF_CARD}>
                <div className="flex items-center gap-3">
                  <PlayerAvatar avatar={creator.avatar ?? undefined} name={creator.username} className="size-12 shrink-0 rounded-xl text-[13px]" />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-[15px] font-semibold text-[var(--text)]" title={creator.username}>{creator.username}</span>
                    <span className="truncate text-[11px] text-[var(--text-dim)]">{creator.steamId}</span>
                  </span>
                </div>
                <span><CreatorBadge tier={creator.tier} label={creator.label} /></span>
                {creator.bio && <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">{creator.bio}</p>}
                <div className="mt-auto flex gap-2">
                  <button type="button" onClick={() => setDraft({ steamId: creator.steamId, tier: creator.tier, bio: creator.bio, links: creator.links })} className={cn(secondary, "flex-1")}><Pencil className="size-4" />Edit</button>
                  <button type="button" aria-label={`Remove ${creator.username}`} disabled={busy} onClick={() => void remove(creator)} className={cn(secondary, "w-9 px-0")}><Trash2 className="size-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </StaffSection>
    </div>
  )
}

/** One waiting application: who, what they said, their channels, and Approve (choosing the role) or Decline (with an optional note). */
function ApplicationRow({ application, busy, onAnswer }: { application: StaffCreatorApplication; busy: boolean; onAnswer: (application: StaffCreatorApplication, decision: "approve" | "decline", tier: CreatorTier, note: string) => Promise<void> }) {
  const [tier, setTier] = useState<CreatorTier>("creator")
  const [note, setNote] = useState("")
  return (
    <li className={STAFF_CARD}>
      <div className="flex items-center gap-3">
        <PlayerAvatar avatar={application.player.avatar ?? undefined} name={application.player.username} className="size-12 shrink-0 rounded-xl text-[13px]" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <a href={`/profile/${application.player.steamId}`} target="_blank" rel="noopener noreferrer" className="truncate text-[15px] font-semibold text-[var(--text)] hover:underline underline-offset-4">{application.player.username}</a>
          <span className="truncate text-[11px] text-[var(--text-dim)]">{application.player.steamId} · {new Date(application.createdAt).toLocaleDateString()}</span>
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">{application.bio}</p>
      <CreatorLinkButtons links={application.links} />
      <div className="mt-auto flex flex-col gap-2 border-t border-[var(--line-soft)] pt-3">
        <div role="radiogroup" aria-label="Role" className="grid h-9 grid-cols-2 gap-0.5 rounded-lg border border-[var(--line)] p-[3px]">
          {(["creator", "main"] as const).map((value) => (
            <button key={value} type="button" role="radio" aria-checked={tier === value} onClick={() => setTier(value)} className={cn("rounded-md px-2 text-[13px] transition-colors", tier === value ? "bg-[var(--line)] text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]")}>
              {value === "main" ? "Main Content Creator" : "Content Creator"}
            </button>
          ))}
        </div>
        <input className={input} maxLength={200} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note for the player (shown if declined)" aria-label="Note" />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => void onAnswer(application, "decline", tier, note)} className={secondary}><X className="size-4" />Decline</button>
          <button type="button" disabled={busy} onClick={() => void onAnswer(application, "approve", tier, note)} className="lx-primary-button inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold disabled:opacity-50"><Check className="size-4" />Approve</button>
        </div>
      </div>
    </li>
  )
}
