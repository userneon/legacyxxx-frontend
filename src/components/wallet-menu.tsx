/**
 * LX wallet next to the profile menu in the top bar: the balance, and a click goes straight to the wallet page (owner request 2026-10-24),
 * where the activity, top-up and how to earn live. It belongs to the signed-in player only and is left out while the balance is
 * unknown (loading, or an API without a wallet), never shown as a made-up zero.
 */
import { useEffect } from "react"
import { Link, useLocation } from "react-router-dom"

import { walletService } from "@/api"
import { AnimatedNumber } from "@/components/animated-number"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { MaskIcon } from "@/components/mask-icon"
import { cn } from "@/lib/utils"
import type { Wallet } from "@/api"

export function WalletMenu() {
  const { user } = useAuth()
  // On the wallet pages the whole entry is green; it goes back to normal when you leave them.
  const onWallet = useLocation().pathname.startsWith("/wallet")
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
      data-wallet=""
      aria-label={`Wallet: ${wallet.balance.toLocaleString()} FOL$`}
      aria-current={onWallet ? "page" : undefined}
      className={cn(
        "flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50",
        onWallet ? "bg-white/[0.08] text-[var(--text)]" : "text-[var(--text)] hover:bg-[var(--line-soft)]",
      )}
    >
      <MaskIcon src="/wallet-icon.webp" className={cn("size-[18px]", onWallet ? "text-[rgb(150_180_255)]" : "text-[var(--text-2)]")} />
      {/* The balance turns over into the word "Wallet" while the pointer is on it (or the link has focus). */}
      <span className="lx-wallet-flip">
        <span className="lx-wallet-front"><AnimatedNumber value={wallet.balance} durationMs={600} /></span>
        <span className="lx-wallet-back" aria-hidden="true">Wallet</span>
      </span>
    </Link>
  )
}
