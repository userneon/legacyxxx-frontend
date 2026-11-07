import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Check, ChevronDown, Lock } from "lucide-react"
import { toast } from "sonner"

import prestige from "@/assets/ranks/prestige.webp"
import imperial from "@/assets/ranks/imperial.webp"
import eternal from "@/assets/ranks/eternal.webp"
import { perksService, type PerkCatalogue, type PerkDays, type PerkGrant, type PerkInvoice, type PerkMine } from "@/api/perks"
import { PERK_EMBLEM } from "@/components/perk-badge"
import { PerkPayDialog } from "@/components/perk-pay-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

const mnt = (value: number) => `${value.toLocaleString()}₮`
/** The owner-supplied card art of each tier (it carries the rank's name). */
const TIER_ART: Record<string, string> = { tier1: prestige, tier2: imperial, tier3: eternal }
const MODE_LABEL: Record<string, string> = { fun: "Fun servers", pro: "Pro League servers", "5x5": "5x5 servers" }
const secondary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3.5 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:opacity-50"
const daysLeft = (iso: string) => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000))

/** The command picker of a rank (owner request 2026-11-07): closing it without saving leaves the picks open; all of them picked locks them until a renewal. */
function PerkPicker({ grant, catalogue, open, onClose, onSaved }: { grant: PerkGrant; catalogue: PerkCatalogue; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [picked, setPicked] = useState<string[]>(grant.commands)
  const [sure, setSure] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setPicked(grant.commands); setSure(false) } }, [open, grant.commands])
  const groups = useMemo(() => {
    const map = new Map<string, PerkCatalogue["pool"]>()
    for (const command of catalogue.pool) map.set(command.group, [...(map.get(command.group) ?? []), command])
    return [...map.entries()]
  }, [catalogue.pool])
  const full = picked.length === grant.quota
  const toggle = (name: string) => { setSure(false); setPicked((current) => (current.includes(name) ? current.filter((entry) => entry !== name) : current.length < grant.quota ? [...current, name] : current)) }
  const save = async () => {
    if (full && !sure) { setSure(true); return }
    setBusy(true)
    try {
      await perksService.saveCommands(picked)
      toast.success(full ? "Saved. Your commands are locked until you renew." : "Saved. You can pick the rest later.")
      onSaved()
      onClose()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "That did not work")
    } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-2xl sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Choose your commands</DialogTitle>
          <DialogDescription>{grant.name}: pick up to {grant.quota}. You can close this and come back any time. Once all {grant.quota} are picked they stay until you renew.</DialogDescription>
        </DialogHeader>
        <div className="flex items-baseline justify-between text-[13px]"><span className="text-[var(--text-muted)]">Picked</span><span className="font-semibold text-[var(--text)]">{picked.length} / {grant.quota}</span></div>
        <div className="flex max-h-[46dvh] flex-col gap-3 overflow-y-auto rounded-lg border border-[var(--line)] p-3">
          {groups.map(([group, commands]) => (
            <div key={group} className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wide text-[var(--text-faint)]">{group}</span>
              <div className="flex flex-wrap gap-1.5">
                {commands.map((command) => {
                  const on = picked.includes(command.name)
                  return <button key={command.name} type="button" aria-pressed={on} disabled={!on && full} title={command.summary || command.name} onClick={() => toggle(command.name)} className={cn("h-8 rounded-lg border px-2.5 text-[13px] transition-colors disabled:opacity-40", on ? "border-[var(--brand)] bg-[var(--brand)]/15 text-[var(--text)]" : "border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]")}>!{command.name}</button>
                })}
              </div>
            </div>
          ))}
        </div>
        {sure && <p role="status" className="text-[12px] text-[var(--text-muted)]">This locks your {grant.quota} commands until you renew. Press the button again to confirm.</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondary}>Later</button>
          <button type="button" disabled={busy || picked.length === 0} onClick={() => void save()} className="lx-primary-button inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-semibold disabled:opacity-50">{full ? (sure ? "Yes, lock them" : "Save and lock") : "Save for now"}</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Shop → Ranks: three in-game ranks for 14, 30 or 90 days, paid straight through QPay (Wire), each with commands the buyer picks. */
export function ShopRanks({ catalogue }: { catalogue: PerkCatalogue }) {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const mine = useApiQuery<PerkMine>((signal) => perksService.mine({ signal }), { enabled: Boolean(user), queryKey: `perk-mine:${user?.id ?? "none"}` })
  // Each card has its own length (owner request 2026-11-07): a dropdown on the card, the price beside it.
  const [lengths, setLengths] = useState<Record<string, PerkDays>>({})
  const daysOf = (tier: PerkCatalogue["tiers"][number]): PerkDays => lengths[tier.key] ?? (catalogue.days.find((value) => tier.prices[String(value)]) ?? 30)
  const [invoice, setInvoice] = useState<PerkInvoice | null>(null)
  const [picker, setPicker] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const grant = mine.data?.grant ?? null
  const pending = mine.data?.pending ?? null

  // Wire sends the buyer back here (?perk=<id>): say how it went, and open the picker for a paid one.
  const returned = params.get("perk")
  useEffect(() => {
    if (!returned || !user) return
    let stopped = false
    void perksService.order(returned).then((order) => {
      if (stopped) return
      if (order.status === "paid") { toast.success("Paid. Your rank is active."); mine.refetch(); setPicker(true) }
      else if (order.status === "pending") toast.message("Waiting for the payment.")
      else toast.error("That payment did not go through. Nothing was charged.")
    }).catch(() => undefined).finally(() => { if (!stopped) setParams((current) => { const next = new URLSearchParams(current); next.delete("perk"); return next }, { replace: true }) })
    return () => { stopped = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returned, user?.id])

  const buy = async (tierKey: string, days: PerkDays) => {
    if (!user) { toast.message("Sign in to buy a rank."); return }
    setBusy(tierKey)
    try { setInvoice(await perksService.checkout(tierKey, days)) } catch (caught) { toast.error((caught as { message?: string }).message ?? "Could not start the payment") } finally { setBusy(null) }
  }
  const modes = catalogue.modes.length ? catalogue.modes.map((mode) => MODE_LABEL[mode] ?? mode).join(", ") : "every kind of server"

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {grant && (
        <section aria-label="Your rank" className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-[var(--brand)]/40 bg-[var(--brand)]/[0.06] p-4">
          {PERK_EMBLEM[grant.tier] && <img src={PERK_EMBLEM[grant.tier]} alt="" aria-hidden="true" width={64} height={64} className="size-16 shrink-0 object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]" />}
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] uppercase tracking-wide text-[var(--text-faint)]">Your rank</span>
            <span className="text-[22px] font-bold text-[var(--text)]">{grant.name}</span>
            <span className="text-[12px] text-[var(--text-muted)]">{daysLeft(grant.endsAt)} days left · until {grant.endsAt.slice(0, 10)}</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-[13px]">
            <span className="text-[var(--text-muted)]">{grant.commands.length} of {grant.quota} commands picked{grant.commands.length ? `: ${grant.commands.map((name) => `!${name}`).join(" ")}` : ""}</span>
            {grant.commands.length < grant.quota && !grant.locked && <span className="text-[var(--text)]">{grant.commands.length === 0 ? `Choose your ${grant.quota} commands.` : `You can still pick ${grant.quota - grant.commands.length}.`}</span>}
            {grant.locked && <span className="inline-flex items-center gap-1.5 text-[var(--text-dim)]"><Lock className="size-3.5" aria-hidden="true" />Locked until you renew.</span>}
          </div>
          {!grant.locked && <button type="button" onClick={() => setPicker(true)} className="lx-primary-button inline-flex h-10 items-center rounded-lg px-5 text-[13px] font-semibold">{grant.commands.length === 0 ? "Choose commands" : "Change commands"}</button>}
        </section>
      )}
      {pending && !invoice && (
        <section aria-label="Open payment" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--card-surface)] p-3.5 text-[13px]">
          <span className="text-[var(--text-muted)]">A payment of {mnt(pending.amountMnt)} is waiting.</span>
          <button type="button" onClick={() => setInvoice({ ...pending, name: catalogue.tiers.find((tier) => tier.key === pending.tier)?.name ?? "Rank", expiresInMinutes: 12 })} className={secondary}>Continue the payment</button>
        </section>
      )}

      <ul className="grid gap-3 md:grid-cols-3">
        {catalogue.tiers.map((tier) => {
          const days = daysOf(tier)
          const price = tier.prices[String(days)]
          const mineHere = grant?.tier === tier.key
          const otherRunning = Boolean(grant) && !mineHere
          const benefits = [
            `${tier.quota} commands you pick yourself, from fun and cheat commands`,
            `Works on ${modes}`,
            "Your emblem and name beside your name in Tab, chat, Leaders and reviews",
            "A badge, a banner and a soft light on your profile",
            "Renew before it ends and pick your commands again",
          ]
          return (
            <li key={tier.key} className={cn("flex min-w-0 flex-col gap-3 rounded-xl border bg-[var(--glass-fill)] p-3", mineHere ? "border-[var(--brand)]" : "border-[var(--glass-line)]")}>
              <div className="flex items-start gap-3">
                {TIER_ART[tier.key] ? <img src={TIER_ART[tier.key]} alt={tier.name} width={640} height={640} loading="lazy" draggable={false} className="size-[88px] shrink-0 rounded-lg object-cover" /> : <h3 className="text-[17px] font-bold text-[var(--text)]">{tier.name}</h3>}
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="text-[13px] text-[var(--text-muted)]">{tier.quota} commands of your choice</span>
                  <label className="flex flex-col gap-1 text-[11px] text-[var(--text-dim)]">
                    How long
                    <select value={days} onChange={(event) => setLengths((current) => ({ ...current, [tier.key]: Number(event.target.value) as PerkDays }))} className="h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 text-[13px] text-[var(--text)] focus-visible:border-[var(--text-faint)] focus-visible:outline-none">
                      {catalogue.days.filter((value) => tier.prices[String(value)]).map((value) => <option key={value} value={value}>{value} days</option>)}
                    </select>
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="lx-shop-price">{price ? mnt(price) : "Not for sale"}</span>
                <button type="button" disabled={!price || busy !== null || otherRunning || !catalogue.available} onClick={() => void buy(tier.key, days)} className="lx-primary-button inline-flex h-9 items-center justify-center rounded-lg px-5 text-[13px] font-semibold disabled:opacity-50">{busy === tier.key ? "Opening…" : mineHere ? "Renew" : "Buy"}</button>
              </div>
              {otherRunning && <span className="text-[11px] text-[var(--text-dim)]">Another rank is running. It must end first.</span>}
              <details className="group rounded-lg border border-[var(--line-soft)] px-3 py-2 text-[12px] text-[var(--text-muted)]">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[var(--text-2)] [&::-webkit-details-marker]:hidden">Benefits<ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
                <ul className="mt-2 flex flex-col gap-1.5">{benefits.map((line) => <li key={line} className="flex items-start gap-2"><Check className="mt-0.5 size-3 shrink-0 text-[var(--text-2)]" aria-hidden="true" />{line}</li>)}</ul>
              </details>
            </li>
          )
        })}
      </ul>
      {!catalogue.available && <p className="text-[12px] text-[var(--text-dim)]">Payment is not set up yet.</p>}

      <details className="text-[13px] text-[var(--text-muted)]">
        <summary className="cursor-pointer text-[var(--text-2)]">The {catalogue.pool.length} commands you can pick from</summary>
        <p className="mt-2 flex flex-wrap gap-1.5">{catalogue.pool.map((command) => <span key={command.name} title={command.summary || undefined} className="rounded-md border border-[var(--line)] px-2 py-0.5 text-[12px]">!{command.name}</span>)}</p>
      </details>

      {user && mine.loading && !mine.data && <Skeleton className="h-10 rounded-lg" />}
      <PerkPayDialog invoice={invoice} onClose={() => setInvoice(null)} onSettled={(status) => { mine.refetch(); if (status === "paid") setPicker(true) }} />
      {grant && <PerkPicker grant={grant} catalogue={catalogue} open={picker} onClose={() => setPicker(false)} onSaved={mine.refetch} />}
    </div>
  )
}
