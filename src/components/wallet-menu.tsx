/**
 * LX wallet next to the profile menu in the top bar: the balance, and a click goes straight to the wallet page (owner request 2026-10-24),
 * where the activity, top-up and how to earn live. It belongs to the signed-in player only and is left out while the balance is
 * unknown (loading, or an API without a wallet), never shown as a made-up zero.
 */
import { useEffect } from "react"
import { Link } from "react-router-dom"

import { walletService } from "@/api"
import { LxMark } from "@/components/lx-mark"
import { AnimatedNumber } from "@/components/animated-number"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import type { Wallet } from "@/api"

export function WalletMenu() {
  const { user } = useAuth()
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
    <Link
      to="/wallet"
      aria-label={`Wallet: ${wallet.balance.toLocaleString()} LX`}
      className="flex h-9 shrink-0 items-center gap-2 rounded-[10px] border border-[var(--line-strong)] px-3 text-[13px] font-semibold text-[var(--text)] transition-colors hover:border-[var(--text-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50"
    >
      <LxMark size={18} />
      <AnimatedNumber value={wallet.balance} durationMs={600} />
    </Link>
  )
}
