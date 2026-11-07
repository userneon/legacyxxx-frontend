import { useState, type ReactNode } from "react"
import { LogOut, Menu, Search, X } from "lucide-react"

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { useAuth } from "@/hooks/use-auth"
import { SITE_URL } from "@/lib/sites"
import { cn } from "@/lib/utils"

export interface ShellItem { value: string; label: string; count?: number }
export interface ShellGroup { title: string; items: ShellItem[] }

/** The tabs the phone's bottom bar carries; everything else is under "More". */
const PHONE_TABS: Array<{ value: string; label: string }> = [
  { value: "overview", label: "Home" },
  { value: "checks", label: "Checks" },
  { value: "penalties", label: "Penalty" },
  { value: "players", label: "Players" },
]

/**
 * The staff site's frame (owner request 2026-11-07): a grouped, numbered list on the left (a menu sheet and a bottom bar on a phone), a slim top bar with where you
 * are and the player finder, and the page in between. The number in front of each entry counts the entries this role sees, so an Admin reads 01 to 04.
 */
export function AdminShell({ groups, current, onGo, onFind, children }: { groups: ShellGroup[]; current: string; onGo: (value: string) => void; onFind: () => void; children: ReactNode }) {
  const { user, logout } = useAuth()
  const [menu, setMenu] = useState(false)
  const flat = groups.flatMap((group) => group.items)
  const label = flat.find((item) => item.value === current)?.label ?? "Staff"
  const go = (value: string) => { onGo(value); setMenu(false) }

  const nav = (
    <nav aria-label="Staff" className="flex-1 overflow-y-auto py-2">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="adm-lbl px-4 pb-1.5 pt-3">{group.title}</p>
          {group.items.map((item) => (
            <button key={item.value} type="button" onClick={() => go(item.value)} aria-current={item.value === current ? "page" : undefined} className="adm-nav-item">
              <span className="adm-nav-key">{String(flat.indexOf(item) + 1).padStart(2, "0")}</span>
              {item.label}
              {item.count ? <span className="adm-count" aria-label={`${item.count} waiting`}>{item.count}</span> : null}
            </button>
          ))}
        </div>
      ))}
    </nav>
  )
  const person = (
    <div className="flex items-center gap-3 border-t border-[var(--line)] px-4 py-3">
      <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center bg-[var(--line)] font-mono text-[11px] font-bold text-[var(--text-2)]">{(user?.username ?? "?").slice(0, 2).toUpperCase()}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-[var(--text)]" title={user?.username}>{user?.username ?? "Staff"}</span>
        <a href={SITE_URL} className="block font-mono text-[10px] text-[var(--text-dim)] hover:text-[var(--text)]">legacyx.cc ↗</a>
      </span>
      <button type="button" onClick={() => void logout()} aria-label="Sign out" className="flex size-8 items-center justify-center text-[var(--text-muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]"><LogOut className="size-4" aria-hidden="true" /></button>
    </div>
  )
  const brand = (closable: boolean) => (
    <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-[var(--line)] px-4">
      <img src="/logolegacyx.webp" alt="" aria-hidden="true" className="size-5 shrink-0" />
      <span className="text-sm font-bold tracking-[0.3px] text-[var(--text)]">LEGACY-<span className="text-[var(--brand-bright)]">X</span></span>
      <span className="adm-lbl ml-auto border border-[var(--line)] px-1.5 py-[3px]">Staff</span>
      {closable && <button type="button" onClick={() => setMenu(false)} aria-label="Close the menu" className="flex size-8 items-center justify-center border border-[var(--line-strong)] text-[var(--text)]"><X className="size-4" aria-hidden="true" /></button>}
    </div>
  )

  return (
    <div className="grid h-svh min-w-0 grid-cols-1 md:grid-cols-[224px_minmax(0,1fr)]">
      <aside className="hidden min-h-0 flex-col border-r border-[var(--line)] bg-[var(--panel)] md:flex">
        {brand(false)}
        {nav}
        {person}
      </aside>
      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[var(--bg)] px-4 md:px-5">
          <button type="button" onClick={() => setMenu(true)} aria-label="Open the menu" className="flex size-8 items-center justify-center border border-[var(--line-strong)] text-[var(--text)] md:hidden"><Menu className="size-4" aria-hidden="true" /></button>
          <p className="min-w-0 truncate font-mono text-xs font-semibold text-[var(--text-muted)]"><span className="max-md:hidden">staff / </span><span className="text-[var(--text)]">{label.toLowerCase()}</span></p>
          <button type="button" onClick={onFind} className="ml-auto flex h-[30px] items-center gap-2.5 border border-[var(--line)] bg-[var(--panel)] px-2.5 text-[13px] text-[var(--text-dim)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text-2)] md:w-[300px]">
            <Search className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="flex-1 text-left max-md:hidden">Find a player or Steam ID</span>
            <kbd className="border border-[var(--line-strong)] px-1.5 font-mono text-[10px] font-semibold text-[var(--text-muted)] max-md:hidden">CTRL K</kbd>
          </button>
        </header>
        <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overflow-x-clip">{children}</main>
        <nav aria-label="Staff quick" className="grid shrink-0 grid-cols-5 border-t border-[var(--line)] bg-[var(--panel)] pb-[env(safe-area-inset-bottom)] md:hidden">
          {PHONE_TABS.filter((tab) => flat.some((item) => item.value === tab.value)).map((tab, index) => {
            const count = flat.find((item) => item.value === tab.value)?.count
            return (
              <button key={tab.value} type="button" onClick={() => go(tab.value)} aria-current={tab.value === current ? "page" : undefined} className="adm-tab">
                <span className="text-[13px]">{String(index + 1).padStart(2, "0")}</span>
                {tab.label}
                {count ? <span className="adm-count" aria-label={`${count} waiting`}>{count}</span> : null}
              </button>
            )
          })}
          <button type="button" onClick={() => setMenu(true)} className={cn("adm-tab", !PHONE_TABS.some((tab) => tab.value === current) && "text-[var(--text)]")}>
            <span className="text-[13px]">≡</span>More
          </button>
        </nav>
      </div>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" showCloseButton={false} className="flex w-[280px] flex-col gap-0 border-[var(--line)] bg-[var(--panel)] p-0 sm:max-w-[280px]">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">The staff site's pages</SheetDescription>
          {brand(true)}
          {nav}
          {person}
        </SheetContent>
      </Sheet>
    </div>
  )
}
