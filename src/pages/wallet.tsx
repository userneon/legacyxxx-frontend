import { useState } from "react"
import { Coins, Plus, QrCode, CreditCard, ShieldCheck, ArrowDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { walletService } from "@/api"
import type { WalletBalance, WalletTransaction } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApiQuery } from "@/hooks/use-api-query"
import { QueryState } from "@/components/query-state"
import { toast } from "sonner"

const CHARGE_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000]

export function WalletPage() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [selectedMethod, setSelectedMethod] = useState<"qpay" | "card" | null>(null)
  const [charging, setCharging] = useState(false)

  const { data: balanceData, loading: balanceLoading, error: balanceError, refetch: refetchBalance } =
    useApiQuery<WalletBalance>((signal) => walletService.getBalance({ signal }))

  const { data: transactions, loading: txLoading, error: txError, refetch: refetchTx } =
    useApiQuery<WalletTransaction[]>((signal) => walletService.getTransactions({ signal }))

  const balance = balanceData?.balance ?? 0
  const txList = transactions ?? []

  const chargeAmount = customAmount ? parseInt(customAmount, 10) : selectedAmount

  const handleCharge = () => {
    if (!chargeAmount || chargeAmount < 1 || !selectedMethod) return
    setCharging(true)
    void walletService
      .charge({ amount: chargeAmount, method: selectedMethod })
      .then(() => {
        toast.success("Balance charged successfully.")
        refetchBalance()
        refetchTx()
        setSelectedAmount(null)
        setCustomAmount("")
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
              <span className="text-xs text-muted-foreground">Secured by LegacyX</span>
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

        {/* Quick amounts */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {CHARGE_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => setSelectedAmount(amount)}
              aria-pressed={selectedAmount === amount}
              className={cn(
                "glass flex flex-col items-center gap-1 rounded-lg py-3 transition-all hover-lift",
                "hover:bg-secondary/60 hover:border-sidebar-border/60",
                selectedAmount === amount
                  ? "border-chart-2/50 bg-chart-2/10 glow-emerald"
                  : ""
              )}
            >
              <Coins className={cn("size-4", selectedAmount === amount ? "text-chart-2" : "text-muted-foreground")} />
              <span className={cn(
                "text-sm font-bold tabular-nums",
                selectedAmount === amount && "text-chart-2"
              )}>{amount.toLocaleString()}</span>
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="flex flex-col gap-2 mb-4">
          <Label htmlFor="custom-amount">Custom Amount</Label>
          <Input
            id="custom-amount"
            type="number"
            placeholder="Enter amount"
            min={1}
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
          />
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
              <QrCode className={cn("size-5", selectedMethod === "qpay" ? "text-chart-2" : "text-muted-foreground")} />
              <span className={cn("text-sm font-medium", selectedMethod === "qpay" && "text-chart-2")}>QPay</span>
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
          disabled={!chargeAmount || chargeAmount < 1 || !selectedMethod || charging}
          onClick={handleCharge}
        >
          <Plus className="size-4" />
          {charging ? "Processing..." : "Charge Now"}
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
