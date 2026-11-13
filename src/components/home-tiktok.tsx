/** Home's TikTok card (owner request 2026-11-13): the same size and layout as the Discord card under it, with TikTok's own black, cyan and red as its background and the 3D mark on the left. The page and its followers / videos come from the API (the server reads TikTok; a number it could not read is left out); VITE_TIKTOK_URL only supplies the link when the API has none. Palette-exempt: TikTok brand. */
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { LINKS } from "@/lib/links"
import { socialService } from "@/api/social"
import { useApiQuery } from "@/hooks/use-api-query"
import tiktok3d from "@/assets/home/tiktok-3d.webp"

function handleOf(url: string) {
  try {
    return new URL(url).pathname.split("/").find((segment) => segment.startsWith("@")) ?? null
  } catch {
    return null
  }
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })

export function TikTokCard({ className }: { className?: string }) {
  const { data } = useApiQuery((signal) => socialService.getTikTok({ signal }), { queryKey: "home-tiktok" })
  const url = data?.url ?? LINKS.tiktok
  if (!url) return null
  const handle = data?.handle ?? handleOf(url)
  const stats = [
    data?.followers != null ? { label: "Followers", value: data.followers } : null,
    data?.videos != null ? { label: "Posts", value: data.videos } : null,
  ].filter((stat): stat is { label: string; value: number } => stat !== null)
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={handle ? `LEGACY-X on TikTok ${handle}` : "LEGACY-X on TikTok"}
      className={cn("lx-tiktok-card group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl p-4 pl-28 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25f4ee]", className)}
    >
      <span className="text-sm font-semibold text-white">TikTok</span>
      {handle ? <span className="max-w-full truncate pb-0.5 text-[22px] font-bold leading-[1.2] text-white">{handle}</span> : <span className="text-[13px] text-white/70">Follow LEGACY-X</span>}
      {stats.length > 0 && (
        <span className="flex items-center gap-4">
          {stats.map((stat) => (
            <span key={stat.label} className="flex flex-col items-center leading-tight" title={`${stat.value.toLocaleString()} ${stat.label.toLowerCase()}`}>
              <span className="text-[15px] font-bold text-white">{compact.format(stat.value)}</span>
              <span className="text-[11px] text-white/60">{stat.label}</span>
            </span>
          ))}
        </span>
      )}
      <span className="mt-1 inline-flex h-9 w-fit items-center gap-1 rounded-lg bg-white px-4 text-[13px] font-semibold text-black transition-colors group-hover:bg-[#e6e6e6]">
        Follow
        <ArrowUpRight className="size-3.5" />
      </span>
      <img src={tiktok3d} alt="" aria-hidden="true" width={96} height={96} className="pointer-events-none absolute left-4 top-1/2 h-24 w-auto -translate-y-1/2 drop-shadow-[0_10px_18px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105" />
    </a>
  )
}
