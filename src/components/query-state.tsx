import { Loader2, Inbox, AlertTriangle, RefreshCw } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { ApiError } from "@/api/types"

interface QueryStateProps {
  loading: boolean
  error: ApiError | null
  empty?: boolean
  emptyMessage?: string
  onRetry?: () => void
  className?: string
}

export function QueryState({
  loading,
  error,
  empty,
  emptyMessage = "Nothing here yet.",
  onRetry,
  className,
}: QueryStateProps) {
  if (loading) {
    return (
      <div className={cn("glass flex flex-col items-center justify-center gap-3 rounded-xl p-12 text-center", className)}>
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("glass flex flex-col items-center justify-center gap-3 rounded-xl p-12 text-center", className)}>
        <AlertTriangle className="size-6 text-destructive" />
        <span className="text-sm text-muted-foreground">{error.message}</span>
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
      <div className={cn("glass flex flex-col items-center justify-center gap-3 rounded-xl p-12 text-center", className)}>
        <Inbox className="size-6 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{emptyMessage}</span>
      </div>
    )
  }

  return null
}
