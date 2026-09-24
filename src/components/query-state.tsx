import type { ReactNode } from "react"
import { Inbox, RefreshCw } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { BlockSkeleton } from "@/components/skeletons"
import type { ApiError } from "@/api/types"

interface QueryStateProps {
  loading: boolean
  error: ApiError | null
  empty?: boolean
  emptyMessage?: string
  onRetry?: () => void
  className?: string
  /** Placeholder shaped like the content; a generic block when omitted. */
  skeleton?: ReactNode
}

export function QueryState({
  loading,
  error,
  empty,
  emptyMessage = "Nothing here yet.",
  onRetry,
  className,
  skeleton,
}: QueryStateProps) {
  if (loading) {
    return (
      <div role="status" aria-label="Loading" aria-busy="true" className={className}>
        {skeleton ?? <BlockSkeleton />}
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("query-state-in glass flex flex-col items-center justify-center gap-3 rounded-xl p-12 text-center", className)}>
        <Inbox className="size-6 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Nothing to show right now.</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        )}
      </div>
    )
  }

  if (empty) {
    return (
      <div className={cn("query-state-in glass flex flex-col items-center justify-center gap-3 rounded-xl p-12 text-center", className)}>
        <Inbox className="size-6 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{emptyMessage}</span>
      </div>
    )
  }

  return null
}
