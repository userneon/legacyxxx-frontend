import { useEffect, useState } from "react"
import { Check, Copy, Download, ScanSearch } from "lucide-react"
import { toast } from "sonner"

import { checksService, type NewCheck } from "@/api/checks"
import type { ApiError } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LINKS } from "@/lib/links"
import "@/components/checks/checks.css"

function failure(error: unknown) {
  const status = (error as Partial<ApiError> | null)?.status
  if (status === 403) return "Only an Admin, Manager or Owner can ask for a check."
  if (status === 409) return "This player already has an open check."
  if (status === 429) return "Too many tries. Wait a moment."
  return "Try again in a moment."
}

/**
 * Ask a player to run the checker program. The one-time code is shown here once (the server keeps only a hash of it);
 * staff send it to the player, who types it into the program.
 */
export function NewCheckDialog({ open, onOpenChange, initialSteamId = "", name, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; initialSteamId?: string; name?: string; onCreated?: () => void }) {
  const [steamId, setSteamId] = useState(initialSteamId)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<NewCheck | null>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (open) { setSteamId(initialSteamId); setCreated(null); setCopied(false) }
  }, [open, initialSteamId])

  const valid = /^\d{17}$/.test(steamId.trim())
  const submit = async () => {
    setBusy(true)
    try {
      setCreated(await checksService.create(steamId.trim()))
      onCreated?.()
    } catch (error) {
      toast.error("Could not make the check", { description: failure(error) })
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => {
    if (!created) return
    try {
      await navigator.clipboard.writeText(created.code)
      setCopied(true)
    } catch {
      toast.error("Could not copy. Select the code and copy it by hand.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="chk-theme rounded-2xl border-[var(--chk-line)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{created ? "Send this code to the player" : name ? `Check ${name}` : "Ask for a check"}</DialogTitle>
          <DialogDescription>
            {created
              ? "The player runs the checker program and types this code. It works once and stops working after an hour. It is not shown again."
              : "The player runs the checker program with a one-time code. They see who asked and must agree before it scans. A result is not a verdict: you read it and decide."}
          </DialogDescription>
        </DialogHeader>
        {created ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--raised)] px-4 py-3">
              <span className="select-all font-mono text-[28px] font-semibold tracking-[4px] text-[var(--chk-accent)] [text-shadow:0_0_18px_color-mix(in_oklab,var(--chk-accent)_55%,transparent)]">{created.code}</span>
              <button type="button" onClick={() => void copy()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 text-[13px] hover:border-[var(--line-strong)]">{copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}{copied ? "Copied" : "Copy"}</button>
            </div>
            {LINKS.checkerDownload && (
              <a href={LINKS.checkerDownload} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[13px] text-[var(--text-2)] hover:text-[var(--text)]"><Download className="size-4" aria-hidden="true" /> Download the checker program (anyone can)</a>
            )}
            <div className="flex justify-end"><Button type="button" onClick={() => onOpenChange(false)}>Done</Button></div>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); if (valid && !busy) void submit() }}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="check-steam-id">Steam ID of the player</Label>
              <Input id="check-steam-id" inputMode="numeric" autoComplete="off" placeholder="76561198…" maxLength={17} value={steamId} onChange={(event) => setSteamId(event.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
              <button type="submit" disabled={!valid || busy} className="lx-primary-button inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold disabled:opacity-50"><ScanSearch className="size-4" aria-hidden="true" />{busy ? "Making…" : "Make a code"}</button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
