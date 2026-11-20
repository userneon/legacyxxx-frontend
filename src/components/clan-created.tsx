import { useEffect } from "react"
import { Check } from "lucide-react"

import createdArt from "@/assets/home/hero-clan-created.webp"

/**
 * Shown full screen when a clan has just been created (owner request 2026-11-17): the founder raises the banner, the clan's name and tag stand
 * in the headline, and the fee that was taken is told plainly. Open clan, Enter or Esc leaves; the clan's own page is where it goes.
 */
export function ClanCreated({ name, tag, fee, onOpen }: { name: string; tag: string; fee: number | null; onOpen: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" || event.key === "Enter") onOpen() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onOpen])
  return (
    <div role="alertdialog" aria-modal="true" aria-label="Clan created" className="fixed inset-0 z-[100] flex items-center overflow-hidden bg-[#060606]">
      <img src={createdArt} alt="" aria-hidden="true" decoding="async" draggable={false} className="lx-welcome-art pointer-events-none absolute inset-0 size-full object-cover object-[60%_center]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,6,6,0.9)_0%,rgba(6,6,6,0.6)_28%,rgba(6,6,6,0.06)_55%,transparent_100%),linear-gradient(180deg,rgba(6,6,6,0.4),transparent_25%,transparent_72%,rgba(6,6,6,0.6))]" />
      <section className="lx-welcome-text relative w-full max-w-[560px] px-6 py-10 sm:px-14" role="status">
        <span className="flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--text-dim)]"><span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-[var(--status-green)] text-[var(--bg)]"><Check className="size-3" aria-hidden="true" /></span>Clan founded</span>
        <h1 className="mt-5 text-[clamp(34px,5vw,58px)] font-bold leading-[1.02] tracking-[-0.03em] text-[var(--text)]">Clan<br /><span className="text-[var(--text-dim)]">created.</span></h1>
        <div className="mt-8 border-t border-[var(--line-soft)] pt-5">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">Your clan</div>
          <div className="mt-2 flex items-center gap-3"><span className="truncate text-[clamp(28px,4vw,42px)] font-bold leading-none tracking-[-0.02em] text-[var(--text)]">{name}</span><span className="rounded-md border border-white/25 px-2 py-0.5 text-[13px] font-semibold tracking-wide text-[var(--text-2)]">{tag}</span></div>
          {fee != null && <div className="mt-3 text-[13px] text-[var(--text-dim)]">{fee.toLocaleString()} FOL$ were taken from your wallet.</div>}
        </div>
        <button type="button" autoFocus onClick={onOpen} className="lx-primary-button lx-hover-blue mt-8 inline-flex h-[50px] items-center rounded-xl px-8 text-[15px] font-bold">Open clan</button>
      </section>
    </div>
  )
}
