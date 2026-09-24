import { useState } from "react"
import { Check, Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"

/** Copies with the clipboard API, falling back to a hidden textarea where that is blocked. */
export async function copyText(value: string, label: string) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable")
    await navigator.clipboard.writeText(value)
  } catch {
    const textarea = document.createElement("textarea")
    textarea.value = value
    textarea.setAttribute("readonly", "")
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand("copy")
    textarea.remove()
    if (!copied) {
      toast.error("Copy failed", { description: "Please copy it manually." })
      return false
    }
  }
  toast.success(`${label} copied`, { description: value })
  return true
}

const STEAM_ID64_BASE = 76561197960265728n

export function steamProfileUrl(steamId64: string) {
  return /^7656\d{13}$/.test(steamId64) ? `https://steamcommunity.com/profiles/${steamId64}` : null
}

/** SteamID64 in the other formats servers, admin tools and websites use. */
export function steamIdFormats(steamId64: string) {
  if (!/^7656\d{13}$/.test(steamId64)) return null
  const accountId = BigInt(steamId64) - STEAM_ID64_BASE
  return {
    steamId3: `[U:1:${accountId}]`,
    steamId2: `STEAM_1:${accountId & 1n}:${accountId >> 1n}`,
    accountId: accountId.toString(),
  }
}

function IdRow({ label, value, copyLabel, href }: { label: string; value: string; copyLabel: string; href?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    if (!(await copyText(value, copyLabel))) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  return (
    <div className="flex items-center gap-1 rounded-xl bg-secondary/50 pr-1">
      <button type="button" onClick={() => void copy()} className="group flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-secondary/70" aria-label={`Copy ${label}`}>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="truncate font-mono text-xs">{value}</div>
        </div>
        {copied ? <Check className="size-4 shrink-0 text-chart-2" /> : <Copy className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />}
      </button>
      {href && (
        <a href={href} target="_blank" rel="noreferrer" aria-label={`Open ${label}`} title="Open" className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground">
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </div>
  )
}

/** Player ID card: Steam profile link first, then every SteamID format. All rows copy on click. */
export function ProfileIds({ steamId64 }: { steamId64: string }) {
  const link = steamProfileUrl(steamId64)
  const formats = steamIdFormats(steamId64)
  return (
    <section className="profile-rise glass rounded-2xl p-4">
      <h2 className="mb-3 text-sm font-semibold">Player ID</h2>
      <div className="flex flex-col gap-1.5">
        {link && <IdRow label="Steam profile" value={link} copyLabel="Steam link" href={link} />}
        <IdRow label="SteamID64" value={steamId64} copyLabel="SteamID64" />
        {formats && (
          <>
            <IdRow label="SteamID3" value={formats.steamId3} copyLabel="SteamID3" />
            <IdRow label="SteamID2" value={formats.steamId2} copyLabel="SteamID2" />
            <IdRow label="Account ID" value={formats.accountId} copyLabel="Account ID" />
          </>
        )}
      </div>
    </section>
  )
}
