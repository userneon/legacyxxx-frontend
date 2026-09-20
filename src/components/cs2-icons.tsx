/**
 * CS2 map and side emblems.
 *
 * The artwork is bundled with the app (`src/assets/...`) rather than fetched from a host path, so it
 * can never 404 the way `/manus-storage/*` did. A map we have no icon for falls back to a neutral
 * drawn marker instead of a broken image.
 */
import { cn } from "@/lib/utils"
import { cs2MapLabel } from "@/lib/cs2-map-art"

import ancientIcon from "@/assets/map-icons/de_ancient.png"
import anubisIcon from "@/assets/map-icons/de_anubis.png"
import cacheIcon from "@/assets/map-icons/de_cache.png"
import dust2Icon from "@/assets/map-icons/de_dust2.png"
import infernoIcon from "@/assets/map-icons/de_inferno.png"
import mirageIcon from "@/assets/map-icons/de_mirage.png"
import nukeIcon from "@/assets/map-icons/de_nuke.png"
import overpassIcon from "@/assets/map-icons/de_overpass.png"
import trainIcon from "@/assets/map-icons/de_train.png"
import vertigoIcon from "@/assets/map-icons/de_vertigo.png"
import tLogo from "@/assets/sides/t.svg"
import ctLogo from "@/assets/sides/ct.svg"

const MAP_ICONS: Record<string, string> = {
  de_ancient: ancientIcon,
  de_anubis: anubisIcon,
  de_cache: cacheIcon,
  de_dust2: dust2Icon,
  de_inferno: infernoIcon,
  de_mirage: mirageIcon,
  de_nuke: nukeIcon,
  de_overpass: overpassIcon,
  de_train: trainIcon,
  de_vertigo: vertigoIcon,
}

function mapKey(value: string) {
  return value.trim().toLowerCase().replace(/^cs_/, "").replace(/[^a-z0-9]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "")
}

/** Map emblem. `className` sizes the badge; the icon sits inside it. */
export function MapIcon({ map, className }: { map: string; className?: string }) {
  const icon = MAP_ICONS[mapKey(map)]
  const label = cs2MapLabel(map)

  return (
    <span
      title={label}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]", className)}
    >
      {icon ? (
        <img src={icon} alt={`${label} map icon`} className="size-[78%] object-contain" />
      ) : (
        <svg viewBox="0 0 24 24" role="img" aria-label={`${label} map icon`} className="size-[62%] text-white/55" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5.4 4.6 7.2v11.4L9 16.8l6 1.8 4.4-1.8V5.4L15 7.2Z" />
          <path d="M9 5.4v11.4M15 7.2v11.4" />
        </svg>
      )}
    </span>
  )
}

/** Terrorist / Counter-Terrorist logo. */
export function SideIcon({ side, className }: { side: "t" | "ct"; className?: string }) {
  const label = side === "t" ? "Terrorist" : "Counter-Terrorist"
  return <img src={side === "t" ? tLogo : ctLogo} alt={label} title={label} className={cn("shrink-0 object-contain", className)} />
}
