import { useNavigate } from "react-router-dom"
import { Coins, PenLine, Shield, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"

import { clansService, type ClanPrices, type MyClanState } from "@/api"
import { Skeleton } from "@/components/ui/skeleton"

interface ShopClanProps {
  prices: ClanPrices | undefined
  balance: number | null
  mine: MyClanState | null | undefined
  loading: boolean
  onChanged: () => void | Promise<unknown>
}

function Card({ icon, title, price, children }: { icon: React.ReactNode; title: string; price: number; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)]">{icon}</span>
        <span className="min-w-0 flex-1 text-[15px] font-semibold text-[var(--text)]">{title}</span>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--text)]"><Coins className="size-3.5 text-[var(--text-dim)]" />{price}</span>
      </div>
      {children}
    </li>
  )
}

const note = "text-[13px] leading-relaxed text-[var(--text-muted)]"
const action = "lx-primary-button mt-auto inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-[13px] font-semibold disabled:opacity-50"
const secondary = "mt-auto inline-flex h-9 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3.5 text-[13px] hover:border-[var(--line-strong)] disabled:opacity-50"

export function ShopClan({ prices, balance, mine, loading, onChanged }: ShopClanProps) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  if (loading || !prices) return <div className="grid gap-3 md:grid-cols-3"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div>

  const membership = mine?.membership ?? null
  const clan = membership?.clan ?? null
  const leader = membership?.role === "leader"
  const clanPath = clan ? `/clans/${clan.number ?? clan.id}` : "/clans"
  const short = (price: number) => (balance != null && balance < price ? `Need ${(price - balance).toLocaleString()} more coins` : null)

  const nextSize = clan ? Math.min(prices.slotCap, clan.maxPlayers + prices.slotStep) : null
  const atCap = clan ? clan.maxPlayers >= prices.slotCap : false

  const buySlots = async () => {
    if (!clan) return
    setBusy(true)
    try {
      await clansService.buySlots(String(clan.id))
      window.dispatchEvent(new Event("legacyx:wallet-changed"))
      toast.success(`${clan.name} now holds ${nextSize} players`)
      await onChanged()
    } catch (caught) {
      toast.error("Could not add the places", { description: caught instanceof Error ? caught.message : "Try again in a moment." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <ul className="grid gap-3 md:grid-cols-3" aria-label="Clan services">
      <Card icon={<Shield className="size-4" />} title="Create a clan" price={prices.create}>
        <p className={note}>Start your own clan with a name, a tag and a picture. You choose who can join.</p>
        {clan ? (
          <button type="button" onClick={() => navigate(clanPath)} className={secondary}>You are in {clan.name}</button>
        ) : (
          <>
            {short(prices.create) && <p className="text-xs text-[var(--text-dim)]">{short(prices.create)}</p>}
            <button type="button" disabled={balance != null && balance < prices.create} onClick={() => navigate("/clans?create=1")} className={action}>Create a clan</button>
          </>
        )}
      </Card>

      <Card icon={<PenLine className="size-4" />} title="Change name or tag" price={prices.rename}>
        <p className={note}>The leader can give the clan a new name or tag. It can change once a week.</p>
        {!clan ? (
          <p className="text-xs text-[var(--text-dim)]">Join or create a clan first.</p>
        ) : !leader ? (
          <p className="text-xs text-[var(--text-dim)]">Only the leader can do this.</p>
        ) : (
          <>
            {short(prices.rename) && <p className="text-xs text-[var(--text-dim)]">{short(prices.rename)}</p>}
            <button type="button" onClick={() => navigate(clanPath)} className={secondary}>Open clan settings</button>
          </>
        )}
      </Card>

      <Card icon={<UserPlus className="size-4" />} title={`+${prices.slotStep} member places`} price={prices.slots}>
        <p className={note}>Make room for more players. Buy it again whenever the clan is full, up to {prices.slotCap} players.</p>
        {!clan ? (
          <p className="text-xs text-[var(--text-dim)]">Join or create a clan first.</p>
        ) : (
          <>
            <p className="inline-flex items-center gap-1.5 text-xs text-[var(--text-2)]"><Users className="size-3.5" />{clan.currentPlayers} of {clan.maxPlayers} places used{!atCap && nextSize ? ` · next ${nextSize}` : ""}</p>
            {!leader ? (
              <p className="text-xs text-[var(--text-dim)]">Only the leader can do this.</p>
            ) : atCap ? (
              <p className="text-xs text-[var(--text-dim)]">The clan is at the largest size.</p>
            ) : (
              <>
                {short(prices.slots) && <p className="text-xs text-[var(--text-dim)]">{short(prices.slots)}</p>}
                <button type="button" disabled={busy || (balance != null && balance < prices.slots)} onClick={buySlots} className={action}>{busy ? "Adding…" : `Add ${prices.slotStep} places`}</button>
              </>
            )}
          </>
        )}
      </Card>
    </ul>
  )
}
