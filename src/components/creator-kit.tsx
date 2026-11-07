import { useState } from "react"
import { Download, PackageOpen } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const secondary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]"
const BASE = "/creator-kit"

type Asset = { file: string; name: string; note: string; light?: boolean }
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

/** The Creators page's kit: logos, thumbnail backgrounds and video overlays to download, with the brand colours and the rules for using them. */
export function CreatorKit() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={secondary}><PackageOpen className="size-4" aria-hidden="true" />Creator kit</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto bg-[var(--panel)] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Creator kit</DialogTitle>
            <DialogDescription>Logos, thumbnail backgrounds and overlays for your videos. Free to use in your Content Creator videos about LEGACY-X.</DialogDescription>
          </DialogHeader>
          <a href={`${BASE}/legacyx-creator-kit.zip`} download className="lx-primary-button inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg px-4 text-[13px] font-semibold"><Download className="size-4" aria-hidden="true" />Download everything (.zip)</a>
          {GROUPS.map((group) => (
            <section key={group.title} aria-label={group.title} className="flex flex-col gap-2.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-faint)]">{group.title} <span className="font-normal normal-case tracking-normal text-[var(--text-dim)]">· {group.hint}</span></h3>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {group.items.map((item) => (
                  <li key={item.file} className="flex flex-col overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--card-surface)]">
                    <div className={cn("flex h-28 items-center justify-center bg-[length:16px_16px]", item.light ? "bg-[repeating-conic-gradient(#e5e5e5_0_25%,#fafafa_0_50%)]" : "bg-[repeating-conic-gradient(#1a1a1a_0_25%,#141414_0_50%)]")}>
                      <img src={`${BASE}/${item.file}`} alt={item.name} loading="lazy" draggable={false} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                      <div className="flex min-w-0 flex-col"><span className="truncate text-[13px] text-[var(--text)]">{item.name}</span><span className="truncate text-[11px] text-[var(--text-dim)]">{item.note}</span></div>
                      <a href={`${BASE}/${item.file}`} download aria-label={`Download ${item.name}`} className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--text-2)] hover:border-[var(--line-strong)] hover:bg-[var(--raised)] hover:text-[var(--text)]"><Download className="size-4" aria-hidden="true" /></a>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
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
