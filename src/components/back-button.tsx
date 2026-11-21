import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"

const look = "inline-flex h-12 shrink-0 items-center gap-3.5 rounded-full border border-[rgb(255_255_255/0.16)] px-6 text-[18px] font-semibold leading-none text-[var(--text)] transition-colors hover:border-[rgb(255_255_255/0.28)] hover:bg-white/[0.08] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"

/**
 * The page-level "← Back" (owner 2026-11-21, the picture of the iPhone's Back): a pill with a thin outline (design A), a thin arrow and a big semibold word. One look for every way back to a list or home;
 * `to` makes it a link, `onClick` a button. The word is "Back" unless the place needs a name.
 */
export function BackButton({ to, onClick, label = "Back", className }: { to?: string; onClick?: () => void; label?: string; className?: string }) {
  const content = <><ArrowLeft className="size-6" strokeWidth={2} aria-hidden="true" />{label}</>
  if (to) return <Link to={to} className={cn(look, className)}>{content}</Link>
  return <button type="button" onClick={onClick} className={cn(look, className)}>{content}</button>
}
