import { Sparkles, Clock } from "lucide-react"

export function SkinchangerPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Coming soon card */}
      <div className="glass shiny-slow glow-violet flex flex-col items-center justify-center rounded-xl p-16 text-center">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-chart-4/15 mb-6">
          <Sparkles className="size-10 text-chart-4" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          The Skinchanger feature is currently under development. You will be able to
          equip custom weapon skins, knives, and gloves directly in-game through the
          LegacyX servers.
        </p>
        <div className="flex items-center gap-2 mt-6 text-sm text-muted-foreground">
          <Clock className="size-4" />
          <span>Stay tuned for updates</span>
        </div>
      </div>
    </div>
  )
}
