/** Page building blocks shared by every page inside the content panel. */
import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Standard page body: 24px padding, sections 18px apart. */
export function Page({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex flex-col gap-[18px] p-4 sm:p-6", className)}>{children}</div>
}

export function PageHeader({ title, subtitle, actions, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="m-0 text-[22px] font-semibold tracking-[-0.3px] text-text">{title}</h1>
        {subtitle && <p className="m-0 text-[13px] text-text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  )
}

/** Card surface: #141414, 1px line-soft, 12px radius. */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-line-soft bg-card", className)} {...props} />
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2 className="m-0 text-[15px] font-semibold text-text">{children}</h2>
      {action}
    </div>
  )
}

/** Search field used in page headers and toolbars. */
export function SearchField({ className, inputClassName, icon, ...props }: ComponentProps<"input"> & { inputClassName?: string; icon: ReactNode }) {
  return (
    <label className={cn("flex h-[38px] items-center gap-2 rounded-[10px] border border-line bg-card px-3 text-text-dim transition-colors duration-150 focus-within:border-line-strong", className)}>
      {icon}
      <input
        type="search"
        className={cn("min-w-0 flex-1 bg-transparent text-[13px] text-text outline-none placeholder:text-text-dim [&::-webkit-search-cancel-button]:hidden", inputClassName)}
        {...props}
      />
    </label>
  )
}
