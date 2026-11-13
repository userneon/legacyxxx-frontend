import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Check, ChevronDown, Lock } from "lucide-react"
import { toast } from "sonner"

import prestige from "@/assets/ranks/gem-prestige.webp"
import imperial from "@/assets/ranks/gem-imperial.webp"
import eternal from "@/assets/ranks/gem-eternal.webp"
import prime from "@/assets/ranks/gem-prime.webp"
import sovereign from "@/assets/ranks/gem-sovereign.webp"
import { ChoiceSelect } from "@/components/choice-select"
import { perksService, type PerkCatalogue, type PerkDays, type PerkGrant, type PerkInvoice, type PerkMine } from "@/api/perks"
import { PERK_EMBLEM, PerkBadge, PerkTitle } from "@/components/perk-badge"
import { ProfileBanner } from "@/components/profile-banner"
import { PerkPayDialog } from "@/components/perk-pay-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

const mnt = (value: number) => `${value.toLocaleString()}₮`
/** The owner-supplied card art of each tier (owner request 2026-11-13, "make the Shop like this"): a gem on a pedestal over a dark rounded panel left empty for the card's text. Copper Prime, steel Prestige, violet Imperial, gold Eternal, diamond Sovereign. */
const TIER_ART: Record<string, string> = { tier1: prestige, tier2: imperial, tier3: eternal, tier4: prime, tier5: sovereign }
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
export function ShopRanks({ catalogue, qa = false }: { catalogue: PerkCatalogue; qa?: boolean }) {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const mine = useApiQuery<PerkMine>((signal) => perksService.mine({ signal }), { enabled: Boolean(user), queryKey: `perk-mine:${user?.id ?? "none"}` })
  // Each card has its own length (owner request 2026-11-07): a dropdown on the card, the price beside it.
  const [lengths, setLengths] = useState<Record<string, PerkDays>>({})
  const daysOf = (tier: PerkCatalogue["tiers"][number]): PerkDays => lengths[tier.key] ?? (catalogue.days.find((value) => tier.prices[String(value)]) ?? 30)
  const [invoice, setInvoice] = useState<PerkInvoice | null>(null)
  const [picker, setPicker] = useState(false)
  // The three cards' Benefits open and close together, so the cards stay level (owner request 2026-11-07).
  const [benefitsOpen, setBenefitsOpen] = useState(false)
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

  // A QA tester switches a rank on for free to try it (owner request 2026-11-07); no payment, the picker opens at once.
  const getFree = async (tierKey: string) => {
    setBusy(tierKey)
    try { await perksService.qaActivate(tierKey); toast.success("Rank switched on for testing."); mine.refetch(); setPicker(true) } catch (caught) { toast.error((caught as { message?: string }).message ?? "That did not work") } finally { setBusy(null) }
  }
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

      <div className="@container"><ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scrollbar-hidden [&>li]:w-[min(72vw,210px)] [&>li]:shrink-0 [&>li]:snap-start @[860px]:mx-0 @[860px]:grid @[860px]:snap-none @[860px]:grid-cols-5 @[860px]:overflow-visible @[860px]:px-0 @[860px]:[&>li]:w-auto">
        {catalogue.tiers.map((tier) => {
          const days = daysOf(tier)
          const price = tier.prices[String(days)]
          const mineHere = grant?.tier === tier.key
          const otherRunning = Boolean(grant) && !mineHere
          const benefits = [
            `${tier.quota} ${tier.quota === 1 ? "command" : "commands"} you pick yourself`,
            `Works on ${modes}`,
            "Emblem and name in Tab, chat, Leaders, reviews",
            "Profile badge, banner, title and light",
            "Renew before it ends to pick again",
          ]
          return (
            <li key={tier.key} className="@container flex min-w-0 flex-col gap-2">
              {/* One card: the gem art with its text, length, price and Buy on its lower panel, and Benefits as the card's own bottom section (owner request 2026-11-13: everything inside the card). */}
              <div className={cn("flex flex-1 flex-col overflow-hidden rounded-[26px] border border-white/10", mineHere && "ring-2 ring-[var(--brand)]")}>
              {/* The art is cut at the lower panel and the panel is stretched (owner request 2026-11-13): the top 88% of the picture is drawn as it is, then a thin strip of the empty panel is stretched to the extra height, so the text has room. */}
              <div className="relative isolate overflow-hidden" style={{ height: "178.3cqw" }}>
                {TIER_ART[tier.key] && (
                  <>
                    <div aria-hidden="true" className="absolute inset-x-0 top-0" style={{ height: "158.3cqw", backgroundImage: `url(${TIER_ART[tier.key]})`, backgroundSize: "100% auto", backgroundPosition: "0 -10cqw" }} />
                    <div aria-hidden="true" className="absolute inset-x-0 bottom-0" style={{ top: "158.3cqw", backgroundImage: `url(${TIER_ART[tier.key]})`, backgroundSize: "100% 1000cqw", backgroundPosition: "0 -880cqw" }} />
                  </>
                )}
                <div className="absolute inset-x-0 bottom-4 top-[115cqw] flex flex-col justify-end gap-[clamp(6px,3cqw,10px)] px-[7%] pb-[1%]">
                  <div>
                    <h3 className="text-[clamp(16px,10cqw,28px)] font-bold leading-none text-white">{tier.name}</h3>
                    <p className="mt-1 text-[clamp(11px,6cqw,14px)] font-medium leading-tight text-white/90">{tier.quota} {tier.quota === 1 ? "command" : "commands"} of your choice</p>
                  </div>
                  <ChoiceSelect<PerkDays> className="!h-10 !rounded-xl !border-white/25 !bg-white/[0.14] !text-[14px] !font-semibold !text-white [&_svg]:!text-white/80 shadow-[inset_0_1px_0_rgb(255_255_255/0.18)] backdrop-blur-md hover:!bg-white/[0.2] @max-[230px]:!h-9 @max-[230px]:!text-[13px]" ariaLabel={`How long, ${tier.name}`} value={days} onChange={(next) => setLengths((current) => ({ ...current, [tier.key]: next }))} options={catalogue.days.filter((value) => tier.prices[String(value)]).map((value) => ({ value, label: `${value} days`, hint: mnt(tier.prices[String(value)] as number) }))} />
                  <div className="flex items-stretch gap-1.5">
                    <span className="grid place-items-center rounded-xl bg-black/40 px-3 text-[clamp(12px,6.4cqw,15px)] font-bold text-[var(--text)] [text-shadow:none]">{price ? mnt(price) : "Not for sale"}</span>
                    <button type="button" disabled={(!qa && (!price || !catalogue.available)) || busy !== null || (otherRunning && !qa)} onClick={() => void (qa ? getFree(tier.key) : buy(tier.key, days))} className="lx-primary-button lx-rank-buy inline-flex h-11 min-w-0 flex-1 items-center justify-center rounded-xl px-3 text-[15px] font-bold disabled:opacity-50 @max-[230px]:h-9 @max-[230px]:text-[13px]">{busy === tier.key ? "Opening…" : qa ? (mineHere ? "Picks" : "Get free") : mineHere ? "Renew" : "Buy"}</button>
                  </div>
                  {otherRunning && !qa && <span className="text-[11px] text-white/65">Another rank is running. It must end first.</span>}
                </div>
              </div>
              <div className="group relative -mt-4 flex-1 bg-white/[0.07] px-3 pt-4 backdrop-blur-md text-[12px] text-[var(--text-muted)]" data-open={benefitsOpen}>
                <button type="button" aria-expanded={benefitsOpen} onClick={() => setBenefitsOpen((open) => !open)} className="flex h-8 w-full cursor-pointer items-center justify-between text-[var(--text-2)]"><span className="@max-[230px]:hidden">Benefits and how it looks</span><span className="hidden @max-[230px]:inline">Benefits</span><ChevronDown className="size-3.5 transition-transform group-data-[open=true]:rotate-180" aria-hidden="true" /></button>
                <div className="grid transition-[grid-template-rows,opacity] duration-300 ease-out [grid-template-rows:0fr] opacity-0 group-data-[open=true]:[grid-template-rows:1fr] group-data-[open=true]:opacity-100 motion-reduce:transition-none">
                  <div className="min-h-0 overflow-hidden">
                <div className="mt-2">
                  {/* What the rank puts on a profile: its banner, badge and title, shown on a sample name. */}
                  <div aria-label={`${tier.name} on a profile`} className="relative isolate h-[72px] overflow-hidden rounded-lg border border-[var(--line-soft)] @max-[260px]:h-[108px]">
                    <ProfileBanner fx={`perk-${tier.key}`} className="h-full" />
                    <div className="relative flex h-full items-center gap-3 px-3 @max-[260px]:flex-col @max-[260px]:items-start @max-[260px]:justify-center @max-[260px]:gap-2">
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[15px] font-bold text-[var(--text)]">Your name</span>
                        <PerkTitle perk={{ tier: tier.key, name: tier.name }} />
                      </span>
                      <span className="ml-auto shrink-0 @max-[260px]:ml-0"><PerkBadge tier={tier.key} name={tier.name} /></span>
                    </div>
                  </div>
                </div>
                <ul className="mb-4 mt-3 flex flex-col gap-2 text-[12px] leading-snug text-[var(--text-2)]">{benefits.map((line) => <li key={line} className="flex items-start gap-2"><Check className="mt-[3px] size-3 shrink-0 text-[var(--status-green)]" aria-hidden="true" />{line}</li>)}</ul>
                  </div>
                </div>
              </div>
              </div>
            </li>
          )
        })}
      </ul></div>
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
