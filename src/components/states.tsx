/**
 * Data states used by every data-driven area (docs/design/PROMPT.md §4):
 * loading = skeletons shaped like the content with a low-contrast shimmer, empty = one short neutral line,
 * error = one line + Retry. Never a blank area.
 */
import type { CSSProperties, ReactNode } from "react"
import { LoaderCircle, RotateCcw, ServerCrash } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden className={cn("block animate-shimmer rounded-full bg-line-soft", className)} style={style} />
}

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex min-h-24 items-center justify-center px-6 py-10 text-center text-[13px] text-text-dim animate-fade-in", className)}>{children}</div>
}

export function ErrorState({ message = "Couldn't load this right now.", onRetry, className }: { message?: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex min-h-24 flex-wrap items-center justify-center gap-3 px-6 py-10 text-[13px] text-text-muted animate-fade-in", className)}>
      <ServerCrash className="size-4 text-text-dim" aria-hidden />
      <span>{message}</span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="size-3.5" />
          Retry
        </Button>
      )}
    </div>
  )
}

/** Small spinner shown in a header while stale data stays visible during a refetch. */
export function InlineLoader({ show, className, label = "Updating" }: { show: boolean; className?: string; label?: string }) {
  return (
    <LoaderCircle
      aria-label={show ? label : undefined}
      aria-hidden={!show}
      className={cn("size-3.5 animate-spin text-text-dim transition-opacity duration-150", show ? "opacity-100" : "opacity-0", className)}
    />
  )
}
