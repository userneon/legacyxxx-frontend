/**
 * LX wallet next to the profile menu in the top bar: a wallet icon with the balance, and the latest LX
 * activity in a panel under it. It belongs to the signed-in player only and is left out while the balance is
 * unknown (loading, or an API without a wallet), never shown as a made-up zero.
 */
import { useEffect, useState } from "react"
import { Wallet as WalletIcon } from "lucide-react"

import { walletService } from "@/api"
import { AnimatedNumber } from "@/components/animated-number"
import { RelativeTime } from "@/components/relative-time"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import type { Wallet } from "@/api"

export function WalletMenu() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const { data: wallet, refetch } = useApiQuery<Wallet>(
    (signal) => walletService.getMine({ signal }),
    { enabled: Boolean(user), queryKey: user ? `wallet:${user.id}` : "wallet:guest" },
  )
  // A purchase elsewhere (avatar frames) announces itself so the header balance follows.
  useEffect(() => {
    window.addEventListener("legacyx:wallet-changed", refetch)
    return () => window.removeEventListener("legacyx:wallet-changed", refetch)
  }, [refetch])
  if (!user || !wallet) return null

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (next) refetch() }}>
      <PopoverTrigger
        aria-label={`Wallet: ${wallet.balance.toLocaleString()} LX`}
        className="flex h-9 shrink-0 items-center gap-2 rounded-[10px] border border-[var(--line-strong)] px-3 text-[13px] font-semibold text-[var(--text)] transition-colors hover:border-[var(--text-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50"
      >
        <WalletIcon className="size-4 text-[var(--text-muted)]" aria-hidden="true" />
        <AnimatedNumber value={wallet.balance} durationMs={600} />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[300px] overflow-hidden rounded-[14px] border-[var(--line-soft)] bg-[var(--panel)] p-0 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col gap-1 border-b border-[var(--line-soft)] p-4">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-dim)]">Your LX</span>
          <span className="text-[26px] font-bold leading-none text-[var(--text)]">{wallet.balance.toLocaleString()}</span>
        </div>
        {wallet.transactions.length === 0 ? (
          <p className="p-4 text-[13px] text-[var(--text-dim)]">No LX activity yet. Finish a ranked match to earn your first LX.</p>
        ) : (
          <ul className="flex max-h-[280px] flex-col overflow-y-auto p-1.5">
            {wallet.transactions.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 rounded-lg px-2.5 py-2">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[13px] text-[var(--text)]" title={entry.reason}>{entry.reason}</span>
                  <RelativeTime value={entry.at} className="text-[11px] text-[var(--text-dim)]" />
                </span>
                <span className={cn("shrink-0 text-[13px] font-semibold", entry.amount > 0 ? "text-[var(--status-green)]" : entry.kind === "penalty" ? "text-[var(--status-red)]" : "text-[var(--text-muted)]")}>
                  {entry.amount > 0 ? "+" : "−"}{Math.abs(entry.amount).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
        {wallet.earn && wallet.earn.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-[var(--line-soft)] p-4">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-dim)]">How to earn</span>
            <ul className="flex flex-col gap-1.5">
              {wallet.earn.map((rule) => (
                <li key={rule.id} className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>{rule.label}</span>
                  <span className="font-semibold text-[var(--text-2)]">+{rule.coins}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
