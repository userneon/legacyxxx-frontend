import { useState } from "react"
import { Check, Clapperboard, Clock, Pencil } from "lucide-react"
import { toast } from "sonner"

import { creatorLinkProblem, creatorsService, CREATOR_PLATFORMS, withHttps, type CreatorLinks, type CreatorPlatform, type MyCreatorApplication } from "@/api/creators"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"

const field = "h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:border-[var(--text-faint)] focus:outline-none"
const secondary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:opacity-50"
const BIO_MIN = 10

const dateText = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" })

/** The Creators page's "Apply" control: a button for a signed-in player, the state of their application, or a sign-in line for a visitor. */
export function CreatorApply({ onAboutSaved }: { onAboutSaved?: () => void }) {
  const { isAuthenticated, loading: authLoading, loginWithSteam } = useAuth()
  const status = useApiQuery<MyCreatorApplication | null>((signal) => (isAuthenticated ? creatorsService.myApplication({ signal }) : Promise.resolve(null)), { queryKey: `creator-application-${isAuthenticated}` })
  const [open, setOpen] = useState(false)

  if (authLoading) return null
  if (!isAuthenticated) {
    return <button type="button" onClick={loginWithSteam} className={secondary}><Clapperboard className="size-4" />Sign in to apply</button>
  }
  const mine = status.data
  if (!mine) return null
  if (mine.isCreator) return <EditAbout about={mine.about ?? ""} onSaved={() => { status.refetch(); onAboutSaved?.() }} />
  const last = mine.application
  if (last?.status === "pending") {
    return <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 text-[13px] text-[var(--text-muted)]"><Clock className="size-4" />Application sent {dateText(last.createdAt)}</span>
  }
  const wait = mine.canApplyAgainAt
  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {last?.status === "declined" && <span className="text-xs text-[var(--text-dim)]">Declined{last.note ? `: ${last.note}` : ""}{wait ? ` · apply again after ${dateText(wait)}` : ""}</span>}
        <button type="button" disabled={Boolean(wait)} onClick={() => setOpen(true)} className="lx-primary-button inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold disabled:opacity-50"><Clapperboard className="size-4" />Become a creator</button>
      </div>
      <ApplyDialog open={open} onOpenChange={setOpen} onSent={status.refetch} />
    </>
  )
}

/** A creator's own About line: a button on the Creators page and a small box to change it. */
function EditAbout({ about, onSaved }: { about: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(about)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try {
      await creatorsService.saveAbout(text.trim())
      toast.success("Your About line is saved")
      setOpen(false)
      onSaved()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not save it")
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <button type="button" onClick={() => { setText(about); setOpen(true) }} className={secondary}><Pencil className="size-4" aria-hidden="true" />Edit my about</button>
      <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next) }}>
        <DialogContent className="bg-[var(--panel)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your About line</DialogTitle>
            <DialogDescription>The line under your name on the Creators page and your profile.</DialogDescription>
          </DialogHeader>
          <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">About your content ({200 - text.length} left)
            <textarea className={`${field} h-24 resize-none py-2`} maxLength={200} value={text} onChange={(event) => setText(event.target.value)} placeholder="CS2 streams every evening, Mongolian commentary" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} disabled={busy} className={secondary}>Cancel</button>
            <button type="button" disabled={busy || !text.trim() || text.trim() === about} onClick={() => void save()} className="lx-primary-button inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold disabled:opacity-50"><Check className="size-4" aria-hidden="true" />Save</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ApplyDialog({ open, onOpenChange, onSent }: { open: boolean; onOpenChange: (open: boolean) => void; onSent: () => void }) {
  const [bio, setBio] = useState("")
  const [links, setLinks] = useState<CreatorLinks>({})
  const [busy, setBusy] = useState(false)
  const cleaned = Object.fromEntries(Object.entries(links).filter(([, url]) => url?.trim()).map(([key, url]) => [key, withHttps(url!)])) as CreatorLinks
  const ready = bio.trim().length >= BIO_MIN && Object.keys(cleaned).length > 0

  const send = async () => {
    // Say which link is wrong before asking the server, whose answer is only "Validation failed".
    for (const [platform, url] of Object.entries(cleaned) as Array<[CreatorPlatform, string]>) {
      const problem = creatorLinkProblem(platform, url)
      if (problem) { toast.error(problem); return }
    }
    setBusy(true)
    try {
      await creatorsService.apply({ bio: bio.trim(), links: cleaned })
      toast.success("Application sent. Staff will answer in a notification.")
      onOpenChange(false)
      onSent()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not send your application")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next) }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-[var(--panel)] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Become a creator</DialogTitle>
          <DialogDescription>Tell us about your content and where to find it. An Owner or Manager reads every application.</DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">About your content ({200 - bio.length} left)
          <textarea className={`${field} h-20 resize-none py-2`} maxLength={200} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="CS2 streams every evening, Mongolian commentary" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {CREATOR_PLATFORMS.map((platform) => (
            <label key={platform.id} className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">{platform.label}
              <input className={field} value={links[platform.id] ?? ""} onChange={(event) => setLinks({ ...links, [platform.id]: event.target.value })} placeholder={platform.example} inputMode="url" />
            </label>
          ))}
        </div>
        <p className="text-xs text-[var(--text-dim)]">Add at least one channel (https links only). If we decline, you can apply again after 7 days.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} disabled={busy} className={secondary}>Cancel</button>
          <button type="button" disabled={!ready || busy} onClick={() => void send()} className="lx-primary-button inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold disabled:opacity-50"><Check className="size-4" />Send application</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
