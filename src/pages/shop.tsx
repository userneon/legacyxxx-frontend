import { Clock, ShoppingBag } from "lucide-react"

export function ShopPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="glass shiny-slow flex flex-col items-center justify-center rounded-xl p-16 text-center">
        <div className="mb-6 flex size-20 items-center justify-center rounded-2xl bg-white/[0.06]">
          <ShoppingBag className="size-10 text-white/75" />
        </div>
        <h2 className="mb-2 text-2xl font-bold tracking-tight">Coming Soon</h2>
        <p className="max-w-md text-muted-foreground">
          The LEGACY-X Shop is currently under development. Soon you will be able to explore
          community rewards and manage your in-platform purchases here.
        </p>
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-4" />
          <span>Stay tuned for updates</span>
        </div>
      </div>
    </div>
  )
}
