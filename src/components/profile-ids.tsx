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

export function steamProfileUrl(steamId64: string) {
  return /^7656\d{13}$/.test(steamId64) ? `https://steamcommunity.com/profiles/${steamId64}` : null
}
