/**
 * The open tabs at the top of a page (owner request 2026-11-14, FACEIT-style UX: "every page has its tabs open at the top; pressing Play does not drop a menu
 * from the sidebar, it opens 5x5 and the tabs above pick the mode"). A sidebar group icon (Play, Skinchanger, Commerce, Community) opens the group's first
 * page, and this bar lists the group's pages. Pages that are not in a group have no bar.
 */
import { useSkinchangerView, setSkinchangerView, type SkinchangerView } from "@/lib/skinchanger-view"
import type { PageId } from "@/api/types"
import { COMMERCE_ITEMS, COMMUNITY_ITEMS, PLAY_ITEMS, SKIN_VIEWS } from "@/components/app-sidebar"
import { cn } from "@/lib/utils"

interface Tab { key: string; label: string; active: boolean; go: () => void }

export function SectionTabs({ currentPage, onNavigate }: { currentPage: PageId; onNavigate: (page: PageId) => void }) {
  const skinView = useSkinchangerView()
  let title = ""
  let tabs: Tab[] = []
  const fromItems = (items: Array<{ id: PageId; label: string }>) => items.map((item) => ({ key: item.id, label: item.label, active: currentPage === item.id, go: () => onNavigate(item.id) }))
  if (currentPage.startsWith("play-")) { title = "Play"; tabs = fromItems(PLAY_ITEMS) }
  else if (COMMERCE_ITEMS.some((item) => item.id === currentPage)) { title = "Commerce"; tabs = fromItems(COMMERCE_ITEMS) }
  else if (COMMUNITY_ITEMS.some((item) => item.id === currentPage)) { title = "Community"; tabs = fromItems(COMMUNITY_ITEMS) }
  else if (currentPage === "skinchanger") {
    title = "Skinchanger"
    tabs = SKIN_VIEWS.map((view) => ({ key: view.id, label: view.label, active: skinView === view.id, go: () => { setSkinchangerView(view.id as SkinchangerView); onNavigate("skinchanger") } }))
  }
  if (tabs.length < 2) return null
  // The LXC frame (owner decision 2026-11-14, "look through the user's eyes"): the rail is the one place that lists every page, so this row lists only the pages of
  // the section you are in, as cards under the top bar (Play: 5x5, Fun, Pro, Tournaments), the open one outlined.
    return (
      <nav aria-label={title} className="mx-auto flex w-full max-w-[1320px] shrink-0 gap-2.5 overflow-x-auto px-6 pb-4 pt-1 max-[559px]:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={tab.go}
            aria-current={tab.active ? "page" : undefined}
            className={cn(
              "flex h-12 min-w-[132px] flex-1 items-center justify-center rounded-lg border bg-[var(--card-surface)] px-4 text-[14px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60",
              tab.active ? "border-2 border-[var(--accent-solid)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-dim)] hover:bg-[var(--raised)] hover:text-[var(--text)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    )
}
