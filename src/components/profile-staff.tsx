import { useState } from "react"
import { Bell, Coins, ScanSearch, Gavel, MinusCircle, PlusCircle, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { penaltyAdminService } from "@/api/moderation-access"
import { walletService } from "@/api/wallet"
import type { ApiError } from "@/api/types"
import { IssuePenaltyDialog, useModerationAccess } from "@/components/penalty-staff"
import { NewCheckDialog } from "@/components/new-check-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const item = "flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[13px] text-[var(--text)] transition-colors hover:bg-[var(--raised)]"

function CoinsDialog({ open, onOpenChange, steamId, name, mode }: { open: boolean; onOpenChange: (open: boolean) => void; steamId: string; name: string; mode: "grant" | "take" }) {
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const value = Number(amount)
  const valid = Number.isInteger(value) && value >= 1 && value <= 1_000_000 && reason.trim().length >= 3
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    try {
      if (mode === "grant") {
        const result = await walletService.grant({ steamId, amount: value, reason: reason.trim() })
        toast.success(`${name} has ${result.balance.toLocaleString()} LX now`)
      } else {
        const result = await walletService.penalize({ steamId, amount: value, reason: reason.trim() })
        toast.success(`${result.taken.toLocaleString()} LX taken from ${name}`, { description: `${result.balance.toLocaleString()} left` })
      }
      setAmount(""); setReason("")
      onOpenChange(false)
    } catch (error) {
      const status = (error as Partial<ApiError> | null)?.status
      toast.error("That did not work", { description: status === 403 ? "Only an Owner can change LX." : "Try again in a moment." })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "grant" ? "Give LX" : "Take LX"} · {name}</DialogTitle>
          <DialogDescription>{mode === "grant" ? "Adds LX to their wallet." : "Takes up to this many LX; a wallet never goes below zero."} It is written to the audit log.</DialogDescription>
        </DialogHeader>
        <form className="mt-2 flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="coins-amount">LX</Label>
            <Input id="coins-amount" type="number" min={1} max={1_000_000} className="w-40" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="coins-reason">Reason</Label>
            <Input id="coins-reason" maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <button type="submit" disabled={!valid || busy} className={cn("inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold disabled:opacity-50", mode === "grant" ? "lx-primary-button" : "border border-[var(--line)] bg-[var(--raised)] text-[var(--status-red)]")}>
              <Coins className="size-4" aria-hidden="true" />{mode === "grant" ? "Give" : "Take"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** A message to one player: it lands in their notification bell. */
function NotifyDialog({ open, onOpenChange, steamId, name }: { open: boolean; onOpenChange: (open: boolean) => void; steamId: string; name: string }) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [busy, setBusy] = useState(false)
  const valid = title.trim().length > 0 && body.trim().length > 0
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    try {
      await penaltyAdminService.notify({ steamId, title: title.trim(), body: body.trim() })
      toast.success(`Sent to ${name}`)
      setTitle(""); setBody("")
      onOpenChange(false)
    } catch (error) {
      const status = (error as Partial<ApiError> | null)?.status
      toast.error("That did not work", { description: status === 404 ? "That player has not signed in to LEGACY-X yet." : status === 403 ? "You are not allowed to do that." : "Try again in a moment." })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Notify {name}</DialogTitle>
          <DialogDescription>Only {name} sees this, in their notification bell. It is written to the audit log.</DialogDescription>
        </DialogHeader>
        <form className="mt-2 flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notify-title">Title</Label>
            <Input id="notify-title" maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notify-body">Message</Label>
            <textarea id="notify-body" rows={4} maxLength={500} value={body} onChange={(event) => setBody(event.target.value)} className="w-full resize-none rounded-lg border border-[var(--line)] bg-transparent px-3 py-2 text-[13px] text-[var(--text)] outline-none transition-[border-color] focus:border-[var(--text-faint)]" />
            <span className="text-right text-[11px] text-[var(--text-dim)]">{body.length}/500</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <button type="submit" disabled={!valid || busy} className="lx-primary-button inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold disabled:opacity-50"><Bell className="size-4" aria-hidden="true" />Send</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Staff-only "Staff" button in a player's profile header: give that player a penalty (their Steam ID is filled in) and,
 * for Owners, give or take LX. Players never see it.
 */
export function ProfileStaffMenu({ steamId, name, onChanged }: { steamId: string; name: string; onChanged: () => void }) {
  const access = useModerationAccess()
  const [open, setOpen] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [coins, setCoins] = useState<"grant" | "take" | null>(null)
  const [notifying, setNotifying] = useState(false)
  const [checking, setChecking] = useState(false)
  if (!access || !steamId) return null
  const canIssue = access.can.ban || access.can.edit || access.can.unban
  const isOwner = access.role === "OWNER"
  const mayCheck = access.role === "OWNER" || access.role === "MANAGER" || access.role === "ADMIN"
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text)] transition-colors hover:border-[var(--line-strong)]">
            <ShieldCheck className="size-3.5" aria-hidden="true" /> Staff
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" sideOffset={8} className="w-52 rounded-xl border-[var(--line)] bg-[var(--panel)] p-1">
          {canIssue && <button type="button" className={item} onClick={() => { setOpen(false); setIssuing(true) }}><Gavel className="size-4 text-[var(--text-muted)]" aria-hidden="true" /> New penalty</button>}
          <button type="button" className={item} onClick={() => { setOpen(false); setNotifying(true) }}><Bell className="size-4 text-[var(--text-muted)]" aria-hidden="true" /> Send notification</button>
          {mayCheck && <button type="button" className={item} onClick={() => { setOpen(false); setChecking(true) }}><ScanSearch className="size-4 text-[var(--text-muted)]" aria-hidden="true" /> Ask for a check</button>}
          {isOwner && <button type="button" className={item} onClick={() => { setOpen(false); setCoins("grant") }}><PlusCircle className="size-4 text-[var(--text-muted)]" aria-hidden="true" /> Give LX</button>}
          {isOwner && <button type="button" className={item} onClick={() => { setOpen(false); setCoins("take") }}><MinusCircle className="size-4 text-[var(--text-muted)]" aria-hidden="true" /> Take LX</button>}
        </PopoverContent>
      </Popover>
      {canIssue && <IssuePenaltyDialog open={issuing} onOpenChange={setIssuing} access={access} initialSteamId={steamId} onIssued={onChanged} />}
      {mayCheck && <NewCheckDialog open={checking} onOpenChange={setChecking} initialSteamId={steamId} name={name} />}
      <NotifyDialog open={notifying} onOpenChange={setNotifying} steamId={steamId} name={name} />
      {isOwner && <CoinsDialog open={coins !== null} onOpenChange={(next) => { if (!next) setCoins(null) }} steamId={steamId} name={name} mode={coins ?? "grant"} />}
    </>
  )
}
