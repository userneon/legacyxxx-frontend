import { clanArtSrc } from "@/api/clans"
import { cn } from "@/lib/utils"

/** A clan's mark: its logo, or its tag on a plain tile when it has none. */
export function ClanMark({ logo, tag, className }: { logo?: string | null; tag: string; className?: string }) {
  const src = clanArtSrc(logo)
  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--raised)] text-[13px] font-bold tracking-wide text-[var(--text)]", className, !src && tag.length > 3 && /size-(8|10|12)\b/.test(className ?? "") && "text-[10px] tracking-normal")}>
      {src ? <img src={src} alt="" className="size-full object-cover" /> : tag}
    </div>
  )
}

