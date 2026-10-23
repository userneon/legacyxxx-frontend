import { useEffect } from "react"

/** Sends the visitor to another site (the page they asked for lives there now), keeping the path they typed. */
export function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => { window.location.replace(to) }, [to])
  return <p className="p-12 text-center text-[13px] text-[var(--text-dim)]">Opening <a href={to} className="text-[var(--text-2)] underline underline-offset-4">{new URL(to).host}</a>…</p>
}
