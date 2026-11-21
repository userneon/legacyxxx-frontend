import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"

const look = "inline-flex h-12 shrink-0 items-center gap-3.5 rounded-xl bg-[color-mix(in_oklab,var(--raised)_78%,white_8%)] px-6 text-[18px] font-semibold leading-none text-[var(--text)] transition-colors hover:bg-[color-mix(in_oklab,var(--raised)_58%,white_14%)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"

/**
 * The page-level "← Back" (owner 2026-11-21, the picture of the iPhone's Back): a soft dark box (a corner of a quarter of its height), a thin arrow and a big semibold word, no outline. One look for every way back to a list or home;
 * `to` makes it a link, `onClick` a button. The word is "Back" unless the place needs a name.
 */
export function BackButton({ to, onClick, label = "Back", className }: { to?: string; onClick?: () => void; label?: string; className?: string }) {
  const content = <><ArrowLeft className="size-6" strokeWidth={2} aria-hidden="true" />{label}</>
  if (to) return <Link to={to} className={cn(look, className)}>{content}</Link>
  return <button type="button" onClick={onClick} className={cn(look, className)}>{content}</button>
}
