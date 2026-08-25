import { useState } from "react"
import { Coins, Plus, CreditCard, ShieldCheck, ArrowDown, TicketPercent, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { walletService } from "@/api"
import type { PromotionQuote, WalletBalance, WalletTransaction } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApiQuery } from "@/hooks/use-api-query"
import { QueryState } from "@/components/query-state"
import { toast } from "sonner"

const COIN_TO_MNT = 2000

export function WalletPage() {
  const [coinAmount, setCoinAmount] = useState("")
  const [selectedMethod, setSelectedMethod] = useState<"qpay" | "card" | null>(null)
  const [charging, setCharging] = useState(false)
  const [promoCode, setPromoCode] = useState("")
  const [promoQuote, setPromoQuote] = useState<PromotionQuote | null>(null)
  const [checkingPromo, setCheckingPromo] = useState(false)
  const [redeemingPromo, setRedeemingPromo] = useState(false)

  const { data: balanceData, loading: balanceLoading, error: balanceError, refetch: refetchBalance } =
    useApiQuery<WalletBalance>((signal) => walletService.getBalance({ signal }))

  const { data: transactions, loading: txLoading, error: txError, refetch: refetchTx } =
    useApiQuery<WalletTransaction[]>((signal) => walletService.getTransactions({ signal }))

  const balance = balanceData?.balance ?? 0
  const txList = transactions ?? []

  const chargeAmount = Number.parseInt(coinAmount, 10)
  const hasValidChargeAmount = Number.isInteger(chargeAmount) && chargeAmount >= 1
  const totalMnt = hasValidChargeAmount ? chargeAmount * COIN_TO_MNT : 0
  const discountedMnt = promoQuote?.context === "wallet_topup" && promoQuote.currency === "MNT" ? promoQuote.finalAmount : totalMnt

  const handlePromo = () => {
    const code = promoCode.trim()
    if (!code) return
    setCheckingPromo(true)
    setPromoQuote(null)
    void walletService
      .previewPromotion({ code, context: hasValidChargeAmount ? "wallet_topup" : "wallet_redeem", ...(hasValidChargeAmount ? { coinAmount: chargeAmount } : {}) })
      .then((quote) => {
        setPromoQuote(quote)
        toast.success(quote.message)
      })
      .catch((err) => toast.error(err?.message ?? "Promo code could not be verified."))
      .finally(() => setCheckingPromo(false))
  }

  const handleRedeem = () => {
    if (!promoCode.trim() || !promoQuote?.redeemable) return
    setRedeemingPromo(true)
    const idempotencyKey = `wallet-promo-${crypto.randomUUID()}`
    void walletService
      .redeemPromotion({ code: promoCode.trim(), idempotencyKey })
      .then((result) => {
        toast.success(result.benefitType === "admin_role" ? "Admin entitlement was granted. Please sign in again to refresh access." : "Promotion redeemed successfully.")
        refetchBalance()
        refetchTx()
        setPromoCode("")
        setPromoQuote(null)
      })
      .catch((err) => toast.error(err?.message ?? "Promo code could not be redeemed."))
      .finally(() => setRedeemingPromo(false))
  }

  const handleCharge = () => {
    if (!hasValidChargeAmount || !selectedMethod) return
    setCharging(true)
    void walletService
      .charge({ amount: chargeAmount, method: selectedMethod })
      .then(() => {
        toast.success("Balance charged successfully.")
        refetchBalance()
        refetchTx()
        setCoinAmount("")
        setSelectedMethod(null)
      })
      .catch((err) => {
        toast.error(err?.message ?? "Failed to charge balance. Please try again.")
      })
      .finally(() => setCharging(false))
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Balance card */}
      <div className="glass shiny-slow glow-emerald rounded-xl p-6">
        {balanceLoading ? (
          <div className="h-10 w-40 rounded-lg bg-secondary/50 animate-pulse" />
        ) : balanceError ? (
          <p className="text-sm text-destructive">{balanceError.message}</p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums">{balance.toLocaleString()}</span>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Coins className="size-4" />
                <span>coins</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <ShieldCheck className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">1 coin = {COIN_TO_MNT.toLocaleString()}₮ · Secured by LegacyX</span>
            </div>
          </>
        )}
      </div>

      {/* Charge section */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <ArrowDown className="size-4 text-muted-foreground" />
          <h2 className="font-semibold">Charge Balance</h2>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <Label htmlFor="coin-amount">How many coins would you like to top up?</Label>
          <Input
            id="coin-amount"
            type="number"
            inputMode="numeric"
            placeholder="e.g. 10"
            min={1}
            step={1}
            value={coinAmount}
            onChange={(e) => setCoinAmount(e.target.value.replace(/[^\d]/g, ""))}
          />
        </div>

        <div className="mb-5 rounded-xl border border-white/[0.1] bg-white/[0.035] px-4 py-3" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>1 coin = {COIN_TO_MNT.toLocaleString()}₮</span>
            <span>Payment total</span>
          </div>
          <div key={hasValidChargeAmount ? chargeAmount : "empty"} className="mt-1.5 flex items-baseline gap-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200">
            <span className="text-2xl font-bold tabular-nums text-foreground">{discountedMnt.toLocaleString()}₮</span>
            {hasValidChargeAmount && <span className="text-xs text-muted-foreground">for {chargeAmount.toLocaleString()} coins</span>}
          </div>
          {promoQuote?.context === "wallet_topup" && promoQuote.discountAmount > 0 && (
            <p className="mt-1 text-xs text-emerald-300">{promoQuote.codeHint} applied · {promoQuote.discountAmount.toLocaleString()}₮ saved</p>
          )}
        </div>

        <div className="mb-5 rounded-xl border border-white/[0.1] bg-white/[0.025] p-4">
          <div className="flex items-center gap-2">
            <TicketPercent className="size-4 text-chart-2" />
            <h3 className="text-sm font-semibold">Promo code</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Creator, partner and LEGACY-X codes are verified securely by the server.</p>
          <div className="mt-3 flex gap-2">
            <Input
              aria-label="Promo code"
              placeholder="LEGACYX-..."
              value={promoCode}
              maxLength={48}
              onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoQuote(null) }}
              onKeyDown={(e) => { if (e.key === "Enter") handlePromo() }}
            />
            <Button type="button" variant="outline" onClick={handlePromo} disabled={!promoCode.trim() || checkingPromo}>
              {checkingPromo ? "Checking…" : "Apply"}
            </Button>
          </div>
          {promoQuote && (
            <div className="mt-3 rounded-lg border border-chart-2/20 bg-chart-2/5 px-3 py-2 text-xs">
              <div className="flex items-center gap-2 font-medium text-foreground"><Sparkles className="size-3.5 text-chart-2" />{promoQuote.campaignName}</div>
              <p className="mt-1 text-muted-foreground">{promoQuote.message}</p>
              {promoQuote.redeemable && (
                <Button type="button" size="sm" className="mt-3" onClick={handleRedeem} disabled={redeemingPromo}>
                  {redeemingPromo ? "Redeeming…" : promoQuote.benefitType === "admin_role" ? "Claim Admin access" : `Claim ${promoQuote.finalAmount.toLocaleString()} coins`}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Payment methods */}
        <div className="flex flex-col gap-2">
          <Label>Payment Method</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedMethod("qpay")}
              aria-pressed={selectedMethod === "qpay"}
              className={cn(
                "glass flex items-center gap-2 rounded-lg px-4 py-3 transition-all hover-lift",
                "hover:bg-secondary/60 hover:border-sidebar-border/60",
                selectedMethod === "qpay"
                  ? "border-chart-2/50 bg-chart-2/10 glow-emerald"
                  : ""
              )}
            >
              <img src="/qpay-logo.webp" alt="QPay" className="h-7 w-[96px] object-contain brightness-0 invert opacity-90" />
            </button>
            <button
              onClick={() => setSelectedMethod("card")}
              aria-pressed={selectedMethod === "card"}
              className={cn(
                "glass flex items-center gap-2 rounded-lg px-4 py-3 transition-all hover-lift",
                "hover:bg-secondary/60 hover:border-sidebar-border/60",
                selectedMethod === "card"
                  ? "border-chart-2/50 bg-chart-2/10 glow-emerald"
                  : ""
              )}
            >
              <CreditCard className={cn("size-5", selectedMethod === "card" ? "text-chart-2" : "text-muted-foreground")} />
              <span className={cn("text-sm font-medium", selectedMethod === "card" && "text-chart-2")}>Card</span>
            </button>
          </div>
        </div>

        <Button
          className="w-full mt-4"
          disabled={!hasValidChargeAmount || !selectedMethod || charging}
          onClick={handleCharge}
        >
          <Plus className="size-4" />
          {charging ? "Processing..." : hasValidChargeAmount ? `Top Up ${chargeAmount.toLocaleString()} Coins` : "Enter Coin Amount"}
        </Button>
      </div>

      {/* Transaction history */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Transaction History</h2>
          {txError && (
            <button
              onClick={refetchTx}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Retry
            </button>
          )}
        </div>

        <QueryState
          loading={txLoading}
          error={txError}
          empty={!txLoading && !txError && txList.length === 0}
          emptyMessage="No transactions yet."
          onRetry={refetchTx}
        />

        {!txLoading && !txError && txList.length > 0 && (
          <div className="flex flex-col gap-2">
            {txList.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex size-8 items-center justify-center rounded-lg",
                    tx.amount > 0 ? "bg-chart-2/15" : "bg-destructive/15"
                  )}>
                    {tx.amount > 0
                      ? <ArrowDown className="size-4 text-chart-2" />
                      : <Coins className="size-4 text-destructive" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{tx.type}</div>
                    <div className="text-xs text-muted-foreground">{tx.date} - {tx.method}</div>
                  </div>
                </div>
                <span className={cn(
                  "text-sm font-bold tabular-nums",
                  tx.amount > 0 ? "text-chart-2" : "text-destructive"
                )}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
