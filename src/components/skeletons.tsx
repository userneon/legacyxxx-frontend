/** Loading placeholders shaped like the content they stand in for. */
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

const bar = "bg-white/[0.06]"

/** Square item cards (skinchanger slots, catalogue skins). */
export function CardGridSkeleton({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-[repeat(auto-fill,minmax(0,9.5rem))] gap-2 max-sm:grid-cols-2", className)} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex aspect-square flex-col rounded-lg border border-border/60 bg-background/60 p-2.5">
          <Skeleton className={cn("flex-1 rounded-md", bar)} />
          <Skeleton className={cn("mt-2 h-3 w-3/4", bar)} />
          <Skeleton className={cn("mt-1 h-2.5 w-1/2", bar)} />
        </div>
      ))}
    </div>
  )
}

/** Generic block for places without a shaped skeleton. */
export function BlockSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass space-y-3 rounded-2xl p-5", className)} aria-hidden="true">
      <Skeleton className={cn("h-4 w-1/3", bar)} />
      <Skeleton className={cn("h-3 w-full", bar)} />
      <Skeleton className={cn("h-3 w-5/6", bar)} />
      <Skeleton className={cn("h-3 w-2/3", bar)} />
    </div>
  )
}
