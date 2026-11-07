import { useEffect, useRef, useState } from "react"
import { ImagePlus, Loader2, Store, X } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { MARKET_RULES, marketImageProblem, marketService, type MarketImage, type MarketListing } from "@/api/market"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const label = "text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-faint)]"
const area = "min-h-[110px] w-full resize-y rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-[13px] text-[var(--text)] placeholder:text-[var(--text-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50"

type NewPhoto = { id: string; file: File; url: string }

/**
 * Sell something (owner request 2026-11-07): a title, a description, photos, and a price, a phone and an email if the seller wants. Phone and email are shown
 * only to signed-in players. With `listing` it edits one: its photos can be taken away and more added.
 */
export function MarketForm({ open, onClose, listing, onSaved }: { open: boolean; onClose: () => void; listing?: MarketListing | null; onSaved?: () => void }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [kept, setKept] = useState<MarketImage[]>([])
  const [photos, setPhotos] = useState<NewPhoto[]>([])
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const created = useRef<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    created.current = null
    setTitle(listing?.title ?? "")
    setDescription(listing?.description ?? "")
    setPrice(listing?.priceMnt === null || listing?.priceMnt === undefined ? "" : String(listing.priceMnt))
    setPhone(listing?.owner?.phone ?? "")
    setEmail(listing?.owner?.email ?? "")
    setKept(listing?.images ?? [])
    setPhotos([])
    setBusy("")
    setError("")
  }, [open, listing])
  useEffect(() => () => photos.forEach((photo) => URL.revokeObjectURL(photo.url)), [photos])

  const room = MARKET_RULES.maxImages - kept.length - photos.length
  const addFiles = (files: FileList | null) => {
    if (!files) return
    const next: NewPhoto[] = []
    for (const file of Array.from(files)) {
      if (next.length >= room) break
      const problem = marketImageProblem(file)
      if (problem) { setError(`${file.name}: ${problem}`); continue }
      next.push({ id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`, file, url: URL.createObjectURL(file) })
    }
    if (next.length) { setError(""); setPhotos((current) => [...current, ...next]) }
    if (input.current) input.current.value = ""
  }

  const priceValue = price.trim() === "" ? null : Number(price.replace(/[\s,₮]/g, ""))
  const priceBad = priceValue !== null && (!Number.isInteger(priceValue) || priceValue < 0 || priceValue > 1_000_000_000)
  const titleOk = title.trim().length >= 3
  const valid = titleOk && !priceBad

  const save = async () => {
    if (!valid || busy) return
    setError("")
    try {
      setBusy("Saving…")
      const body = { title: title.trim(), description: description.trim(), priceMnt: priceValue, phone: phone.trim(), email: email.trim() }
      let id = listing?.id ?? created.current
      if (!id) {
        id = (await marketService.create(body)).id
        created.current = id
      } else {
        await marketService.update(id, body)
      }
      if (listing) {
        const gone = listing.images.filter((image) => !kept.some((entry) => entry.id === image.id))
        for (const image of gone) await marketService.removeImage(id, image.id)
      }
      const todo = [...photos]
      for (let index = 0; index < todo.length; index += 1) {
        setBusy(`Uploading photo ${index + 1} of ${todo.length}…`)
        await marketService.addImage(id, todo[index].file)
        setPhotos((current) => current.filter((photo) => photo.id !== todo[index].id))
      }
      onSaved?.()
      onClose()
      navigate(`/market/${id}`)
    } catch (failure) {
      setError((failure as { message?: string }).message ?? "Could not save it. Try again.")
      setBusy("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onClose() }}>
      <DialogContent className="lx-add-box max-h-[90dvh] overflow-y-auto bg-[var(--panel)] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5"><span className="lx-add-icon"><Store className="size-4" aria-hidden="true" /></span>{listing ? "Edit your listing" : "Sell something"}</DialogTitle>
          <DialogDescription>Anything you like. LEGACY-X does not take part in the deal: meet in a safe place and check the item before you pay.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); void save() }}>
          <label className="flex flex-col gap-1.5"><span className={label}>Title</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value.slice(0, MARKET_RULES.titleMax))} maxLength={MARKET_RULES.titleMax} placeholder="What are you selling?" aria-invalid={title.length > 0 && !titleOk} />
          </label>
          <label className="flex flex-col gap-1.5"><span className={label}>Description <span className="font-normal normal-case tracking-normal text-[var(--text-dim)]">· {description.length}/{MARKET_RULES.descriptionMax}</span></span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value.slice(0, MARKET_RULES.descriptionMax))} placeholder="Condition, size, where, anything a buyer should know." className={area} />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5"><span className={label}>Price (₮) <span className="font-normal normal-case tracking-normal text-[var(--text-dim)]">· optional</span></span>
              <Input value={price} onChange={(event) => setPrice(event.target.value.replace(/[^\d\s,]/g, "").slice(0, 14))} inputMode="numeric" placeholder="Ask" aria-invalid={priceBad} />
            </label>
            <label className="flex flex-col gap-1.5"><span className={label}>Phone <span className="font-normal normal-case tracking-normal text-[var(--text-dim)]">· optional</span></span>
              <Input value={phone} onChange={(event) => setPhone(event.target.value.slice(0, 24))} inputMode="tel" placeholder="+976 …" autoComplete="tel" />
            </label>
            <label className="flex flex-col gap-1.5"><span className={label}>Email <span className="font-normal normal-case tracking-normal text-[var(--text-dim)]">· optional</span></span>
              <Input value={email} onChange={(event) => setEmail(event.target.value.slice(0, 120))} inputMode="email" type="email" placeholder="you@example.com" autoComplete="email" />
            </label>
          </div>
          <p className="-mt-2 text-[12px] text-[var(--text-dim)]">Your phone and email are shown only to players who are signed in.</p>
          <div className="flex flex-col gap-2">
            <span className={label}>Photos <span className="font-normal normal-case tracking-normal text-[var(--text-dim)]">· up to {MARKET_RULES.maxImages}, PNG, JPEG, GIF or WebP, 8 MB each; the first is the cover</span></span>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {kept.map((image, index) => (
                <li key={image.id} className="relative aspect-square overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--card-surface)]">
                  <img src={image.url} alt={`Photo ${index + 1}`} className="size-full object-cover" />
                  <button type="button" aria-label="Remove this photo" onClick={() => setKept((current) => current.filter((entry) => entry.id !== image.id))} className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-md bg-[var(--bg)]/80 text-[var(--text)] hover:bg-[var(--bg)]"><X className="size-3.5" aria-hidden="true" /></button>
                </li>
              ))}
              {photos.map((photo, index) => (
                <li key={photo.id} className="relative aspect-square overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--card-surface)]">
                  <img src={photo.url} alt={`New photo ${index + 1}`} className="size-full object-cover" />
                  <button type="button" aria-label="Remove this photo" onClick={() => setPhotos((current) => current.filter((entry) => entry.id !== photo.id))} className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-md bg-[var(--bg)]/80 text-[var(--text)] hover:bg-[var(--bg)]"><X className="size-3.5" aria-hidden="true" /></button>
                </li>
              ))}
              {room > 0 && (
                <li>
                  <button type="button" onClick={() => input.current?.click()} className={cn("flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--line-strong)] text-[11px] text-[var(--text-2)] hover:bg-[var(--raised)]")}><ImagePlus className="size-5" aria-hidden="true" />Add</button>
                </li>
              )}
            </ul>
            <input ref={input} type="file" accept={MARKET_RULES.types.join(",")} multiple hidden onChange={(event) => addFiles(event.target.files)} />
          </div>
          {error && <p role="alert" className="text-[13px] text-[var(--status-red)]">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <button type="button" disabled={Boolean(busy)} onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] hover:border-[var(--line-strong)] disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={!valid || Boolean(busy)} className="lx-primary-button inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold disabled:opacity-50">
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}{busy || (listing ? "Save" : "Post")}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
