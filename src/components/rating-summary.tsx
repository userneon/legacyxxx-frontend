import { Rating } from "@/components/reui/rating"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

/** Average score and a 5-to-1 star breakdown of the given ratings (c-rating-6 pattern). */
export function RatingSummary({ ratings, className }: { ratings: number[]; className?: string }) {
  const total = ratings.length
  const average = total ? ratings.reduce((sum, value) => sum + value, 0) / total : 0
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = ratings.filter((value) => Math.round(value) === stars).length
    return { stars, count, percentage: total ? Math.round((count / total) * 100) : 0 }
  })

  return (
    <div className={cn("w-full space-y-4", className)}>
      <div className="flex flex-col items-center gap-2">
        <span className="text-3xl font-semibold tabular-nums">{average.toFixed(1)}</span>
        <Rating rating={average} size="sm" aria-label={`${average.toFixed(1)} out of 5`} />
        <span className="text-muted-foreground text-xs">
          Based on {total.toLocaleString()} review{total === 1 ? "" : "s"}
        </span>
      </div>
      <Separator />
      <div className="space-y-2">
        {distribution.map((row) => (
          <div key={row.stars} className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground w-3 text-right text-xs">
              {row.stars}
            </span>
            <Progress
              value={row.percentage}
              aria-label={`${row.stars} star: ${row.percentage}%`}
              className="h-1.5 flex-1 **:data-[slot=progress-indicator]:bg-yellow-400"
            />
            <span className="text-muted-foreground w-7 text-right text-xs tabular-nums">
              {row.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
