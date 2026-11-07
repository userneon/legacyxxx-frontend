import { useEffect, useRef, useState } from "react"
import { Download, Loader2, PackageOpen } from "lucide-react"
import { toast } from "sonner"

import { creatorsService, type MyReferral } from "@/api/creators"
import { CreatorKitAnimated } from "@/components/creator-kit-animated"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { cleanCode, cleanName, fetchBytes, loadSlots, personalise, type Personal, type Slots } from "@/lib/creator-kit"
import { makeZip, type ZipFile } from "@/lib/zip-store"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const field = "h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] text-[var(--text)] placeholder:text-[var(--text-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50"
const secondary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]"
const BASE = "/creator-kit"

type BannerEntry = { file: string; name: string; size: string; accent: "mono" | "violet" }
type Asset = { file: string; name: string; note: string; light?: boolean; video?: boolean }
type Group = { title: string; hint: string; items: Asset[] }

/** What the kit holds (public/creator-kit/, drawn by scripts/make-creator-kit.mjs). Real files: nothing here is a sample. */
const GROUPS: Group[] = [
  {
    title: "Logo",
    hint: "The name as text, sharp at any size. White on dark, black on light.",
    items: [
      { file: "logo/legacyx-wordmark-brand.png", name: "Wordmark, violet X", note: "3000 px, transparent" },
      { file: "logo/legacyx-wordmark-white.png", name: "Wordmark, white", note: "3000 px, transparent" },
      { file: "logo/legacyx-wordmark-black.png", name: "Wordmark, black", note: "For light backgrounds", light: true },
    ],
  },
  {
    title: "Thumbnails",
    hint: "Backgrounds with the name in the corner. Put your picture and words on top.",
    items: [
      { file: "thumbnail/thumbnail-16x9-violet.png", name: "16:9, violet", note: "1280 × 720, YouTube" },
      { file: "thumbnail/thumbnail-16x9-dark.png", name: "16:9, dark", note: "1280 × 720, YouTube" },
      { file: "thumbnail/thumbnail-9x16-violet.png", name: "9:16, violet", note: "1080 × 1920, TikTok, Shorts, Reels" },
      { file: "thumbnail/thumbnail-9x16-dark.png", name: "9:16, dark", note: "1080 × 1920, TikTok, Shorts, Reels" },
    ],
  },
  {
    title: "Ready-made animations",
    hint: "Transparent WebM, 1920 × 1080: put them on a layer above your clip. The same for everyone.",
    items: [
      { file: "video/community-intro.webm", name: "Community intro", note: "The L, then COUNTER-STRIKE COMMUNITY, 5 s", video: true },
      { file: "video/logo-sting.webm", name: "Logo sting", note: "The mark and LEGACY-X, 4 s", video: true },
      { file: "video/wipe-transition.webm", name: "Wipe transition", note: "Between two clips, 1.2 s", video: true },
      { file: "video/community-badge.webm", name: "Community badge", note: "Slides in at the corner, 5 s", video: true },
    ],
  },
  {
    title: "Video overlays",
    hint: "Transparent 1920 × 1080 pictures: lay them on a layer above your game.",
    items: [
      { file: "overlay/lower-third.png", name: "Lower third", note: "Type your name in the empty space" },
      { file: "overlay/powered-by.png", name: "Powered by badge", note: "Top-right corner" },
      { file: "overlay/creator-code.png", name: "Creator code bar", note: "Type your code in the empty box" },
      { file: "overlay/end-card.png", name: "End card", note: "Play ranked on LEGACY-X, 5 seconds" },
    ],
  },
]

const COLOURS: Array<[string, string]> = [["Black", "#0a0a0a"], ["White", "#fafafa"], ["Violet", "#8b5cf6"], ["Soft violet", "#a78bfa"]]

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24)

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** The Creators page's kit: logos, thumbnail backgrounds and video overlays to download, with the brand colours and the rules for using them. A name (and a code) typed here is written onto them. */
export function CreatorKit() {
  const [open, setOpen] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [slots, setSlots] = useState<Slots | null>(null)
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [banners, setBanners] = useState<BannerEntry[]>([])
  const [accent, setAccent] = useState<"mono" | "violet">("mono")
  const touched = useRef({ name: false, code: false })
  const mine = useApiQuery<{ isCreator: boolean } | null>((signal) => (isAuthenticated && open ? creatorsService.myApplication({ signal }) : Promise.resolve(null)), { queryKey: `kit-creator-${isAuthenticated}-${open}` })
  const referral = useApiQuery<MyReferral | null>((signal) => (mine.data?.isCreator ? creatorsService.myReferral({ signal }) : Promise.resolve(null)), { queryKey: `kit-referral-${Boolean(mine.data?.isCreator)}` })

  // The first time it opens: their own name, and their code when they are a creator. Anything they type stays.
  useEffect(() => { if (open && !touched.current.name && user?.username) setName(cleanName(user.username)) }, [open, user?.username])
  useEffect(() => { if (open && !touched.current.code && referral.data?.code) setCode(referral.data.code) }, [open, referral.data?.code])
  useEffect(() => {
    if (!open || banners.length > 0) return
    fetch(`${BASE}/banner/manifest.json`).then((response) => (response.ok ? response.json() : [])).then((list: BannerEntry[]) => setBanners(Array.isArray(list) ? list : [])).catch(() => undefined)
  }, [open, banners.length])
  useEffect(() => {
    if (!open || slots) return
    loadSlots().then(setSlots).catch(() => setSlots({}))
  }, [open, slots])

  const personal: Personal = { name: cleanName(name), code: cleanCode(code) }
  const personalised = Boolean(personal.name || personal.code)

  // Pictures with the name written on them, shown while it is typed (a moment after the last key).
  useEffect(() => {
    if (!open || !slots) return
    let cancelled = false
    const made: string[] = []
    const timer = window.setTimeout(async () => {
      const next: Record<string, string> = {}
      for (const file of Object.keys(slots)) {
        try {
          const blob = await personalise(file, personal, slots)
          if (blob && !cancelled) { const url = URL.createObjectURL(blob); made.push(url); next[file] = url }
        } catch { /* the plain picture stays */ }
      }
      if (!cancelled) setPreviews(next)
    }, 350)
    return () => { cancelled = true; window.clearTimeout(timer); made.forEach((url) => window.setTimeout(() => URL.revokeObjectURL(url), 2000)) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, slots, personal.name, personal.code])

  const saveOne = async (item: Asset) => {
    setBusy(true)
    try {
      const blob = slots ? await personalise(item.file, personal, slots) : null
      const base = item.file.split("/").pop() ?? item.file
      if (blob) save(blob, base.replace(/\.png$/, `-${slug(personal.name) || "me"}.png`))
      else save(new Blob([await fetchBytes(item.file) as BlobPart]), base)
    } catch (error) {
      toast.error((error as Error).message || "Could not make the picture")
    } finally {
      setBusy(false)
    }
  }

  const saveAll = async () => {
    setBusy(true)
    try {
      const files: ZipFile[] = []
      for (const group of GROUPS) {
        for (const item of group.items) {
          const blob = slots ? await personalise(item.file, personal, slots) : null
          files.push({ name: item.file, data: blob ? new Uint8Array(await blob.arrayBuffer()) : await fetchBytes(item.file) })
        }
      }
      for (const banner of banners) files.push({ name: banner.file, data: await fetchBytes(banner.file) })
      files.push({ name: "logo/legacyx-mark-small.webp", data: await fetchBytes("logo/legacyx-mark-small.webp") }, { name: "BRAND.txt", data: await fetchBytes("BRAND.txt") })
      save(makeZip(files), `legacyx-creator-kit${personal.name ? `-${slug(personal.name)}` : ""}.zip`)
    } catch (error) {
      toast.error((error as Error).message || "Could not make the zip")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={secondary}><PackageOpen className="size-4" aria-hidden="true" />Creator kit</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto bg-[var(--panel)] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Creator kit</DialogTitle>
            <DialogDescription>Logos, thumbnail backgrounds and overlays for your videos. Free to use in your Content Creator videos about LEGACY-X.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-faint)]">Your name
              <input value={name} onChange={(event) => { touched.current.name = true; setName(event.target.value.slice(0, 24)) }} maxLength={24} placeholder="Written on the thumbnails, lower third and end card" className={cn(field, "font-normal normal-case tracking-normal")} />
            </label>
            <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-faint)]">Your creator code <span className="font-normal normal-case tracking-normal text-[var(--text-dim)]">(optional)</span>
              <input value={code} onChange={(event) => { touched.current.code = true; setCode(cleanCode(event.target.value)) }} maxLength={8} placeholder="Written in the code bar" className={cn(field, "font-mono font-normal uppercase tracking-[0.2em]")} />
            </label>
          </div>
          <button type="button" disabled={busy} onClick={() => void saveAll()} className="lx-primary-button inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg px-4 text-[13px] font-semibold disabled:opacity-60">
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
            {personalised ? "Download everything with my name (.zip)" : "Download everything (.zip)"}
          </button>
          {GROUPS.map((group) => (
            <section key={group.title} aria-label={group.title} className="flex flex-col gap-2.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-faint)]">{group.title} <span className="font-normal normal-case tracking-normal text-[var(--text-dim)]">· {group.hint}</span></h3>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {group.items.map((item) => (
                  <li key={item.file} className="flex flex-col overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--card-surface)]">
                    <div className={cn("flex h-28 items-center justify-center bg-[length:16px_16px]", item.light ? "bg-[repeating-conic-gradient(#e5e5e5_0_25%,#fafafa_0_50%)]" : "bg-[repeating-conic-gradient(#1a1a1a_0_25%,#141414_0_50%)]")}>
                      {item.video ? (
                        <video src={`${BASE}/${item.file}`} aria-label={item.name} autoPlay loop muted playsInline preload="metadata" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <img src={previews[item.file] ?? `${BASE}/${item.file}`} alt={item.name} loading="lazy" draggable={false} className="max-h-full max-w-full object-contain" />
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                      <div className="flex min-w-0 flex-col"><span className="truncate text-[13px] text-[var(--text)]">{item.name}</span><span className="truncate text-[11px] text-[var(--text-dim)]">{previews[item.file] ? "With your name" : item.note}</span></div>
                      <button type="button" disabled={busy} onClick={() => void saveOne(item)} aria-label={`Download ${item.name}`} className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--text-2)] hover:border-[var(--line-strong)] hover:bg-[var(--raised)] hover:text-[var(--text)] disabled:opacity-50"><Download className="size-4" aria-hidden="true" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {banners.length > 0 && (
            <section aria-label="Banners and badges" className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-faint)]">Banners and badges <span className="font-normal normal-case tracking-normal text-[var(--text-dim)]">· transparent PNG at twice the size, for a stream or a video</span></h3>
                <div role="group" aria-label="Look" className="inline-flex rounded-lg border border-[var(--line)] p-0.5">
                  {(["mono", "violet"] as const).map((value) => (
                    <button key={value} type="button" aria-pressed={accent === value} onClick={() => setAccent(value)} className={cn("h-7 rounded-md px-3 text-[12px] transition-colors", accent === value ? "bg-[var(--raised)] text-[var(--text)]" : "text-[var(--text-dim)] hover:text-[var(--text)]")}>{value === "mono" ? "Grey" : "Violet"}</button>
                  ))}
                </div>
              </div>
              <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {banners.filter((banner) => banner.accent === accent).map((banner) => (
                  <li key={banner.file} className="flex flex-col overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--card-surface)]">
                    <div className="flex h-24 items-center justify-center bg-[repeating-conic-gradient(#1a1a1a_0_25%,#141414_0_50%)] bg-[length:16px_16px] p-2">
                      <img src={`${BASE}/${banner.file}`} alt={banner.name} loading="lazy" draggable={false} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                      <div className="flex min-w-0 flex-col"><span className="truncate text-[13px] text-[var(--text)]">{banner.name.replace(/ \((grey|violet)\)$/, "")}</span><span className="truncate text-[11px] text-[var(--text-dim)]">{banner.size}</span></div>
                      <button type="button" disabled={busy} onClick={() => void saveOne({ file: banner.file, name: banner.name, note: banner.size })} aria-label={`Download ${banner.name}`} className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--text-2)] hover:border-[var(--line-strong)] hover:bg-[var(--raised)] hover:text-[var(--text)] disabled:opacity-50"><Download className="size-4" aria-hidden="true" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {isAuthenticated && <CreatorKitAnimated name={personal.name} code={personal.code} />}
          <section aria-label="Colours and rules" className="flex flex-col gap-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-faint)]">Colours <span className="font-normal normal-case tracking-normal text-[var(--text-dim)]">· name in Black Ops One, the rest in Exo 2</span></h3>
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {COLOURS.map(([name, hex]) => (
                <li key={hex} className="flex items-center gap-2.5 rounded-[10px] border border-[var(--line)] bg-[var(--card-surface)] p-2.5">
                  <span className="size-8 shrink-0 rounded-lg border border-[var(--line-strong)]" style={{ backgroundColor: hex }} aria-hidden="true" />
                  <span className="flex min-w-0 flex-col"><span className="truncate text-[13px] text-[var(--text)]">{name}</span><span className="font-mono text-[11px] uppercase text-[var(--text-dim)]">{hex}</span></span>
                </li>
              ))}
            </ul>
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-[var(--text-2)]">
              <li>Write it LEGACY-X in capitals, on black or a dark picture. Do not stretch, rotate or add a glow to it.</li>
              <li>Say it is a Content Creator video, not an official announcement, unless staff said so.</li>
              <li>Do not use the kit on videos that show cheats or break the server rules.</li>
              <li>Your creator code is in <span className="text-[var(--text)]">My code</span>: type it into the Creator code bar and say it in the video.</li>
            </ul>
          </section>
        </DialogContent>
      </Dialog>
    </>
  )
}
