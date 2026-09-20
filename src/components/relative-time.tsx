import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

/** "just now", "5 minutes ago", "yesterday", "2 weeks ago"; older than a month falls back to a short calendar date. */
export function formatRelativeTime(date: Date, now = Date.now()) {
  const elapsed = now - date.getTime()
  if (elapsed < 45_000 && elapsed > -MINUTE) return "just now"
  if (elapsed < HOUR) return relative.format(-Math.max(1, Math.round(elapsed / MINUTE)), "minute")
  if (elapsed < DAY) return relative.format(-Math.round(elapsed / HOUR), "hour")
  if (elapsed < 7 * DAY) return relative.format(-Math.round(elapsed / DAY), "day")
  if (elapsed < 30 * DAY) return relative.format(-Math.round(elapsed / (7 * DAY)), "week")
  const sameYear = date.getFullYear() === new Date(now).getFullYear()
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) })
}

/** One shared clock so every timestamp on the page re-renders together once a minute. */
let listeners = new Set<() => void>()
let timer: number | undefined

function subscribeToMinuteTick(listener: () => void) {
  listeners.add(listener)
  if (timer === undefined) timer = window.setInterval(() => listeners.forEach((notify) => notify()), MINUTE)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer !== undefined) {
      window.clearInterval(timer)
      timer = undefined
      listeners = new Set()
    }
  }
}

/**
 * Human-friendly timestamp with the exact local date and time on hover. Unparseable values are shown
 * as given. `prefix` puts the timestamp in context, e.g. "Issued 2 days ago".
 */
export function RelativeTime({ value, prefix, className }: { value: string | null | undefined; prefix?: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => subscribeToMinuteTick(() => setNow(Date.now())), [])

  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return <span className={className}>{value}</span>

  const exact = date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
  return (
    <time dateTime={date.toISOString()} title={exact} className={cn("tabular-nums", className)}>
      {prefix}{formatRelativeTime(date, now)}
    </time>
  )
}
