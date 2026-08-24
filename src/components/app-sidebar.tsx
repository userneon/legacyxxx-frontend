import { useState, useRef, useEffect, useCallback } from "react"
import {
  Home,
  Trophy,
  Swords,
  Store,
  Search,
  MessageSquare,
  ChevronDown,
  Crosshair,
  Flame,
  Crown,
  Paintbrush,
  Gavel,
  Play,
  type LucideIcon,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import type { PageId } from "@/api/types"

interface AppSidebarProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
}

interface NavItem {
  id: PageId
  label: string
  icon: LucideIcon
  badge?: string
}

const PLAY_SUB_ITEMS: NavItem[] = [
  { id: "play-5vs5", label: "5x5 MATCHES", icon: Crosshair },
  { id: "play-fun", label: "Fun Mode", icon: Flame },
  { id: "play-proleague", label: "Pro League", icon: Crown },
  { id: "play-tournaments", label: "Tournaments", icon: Trophy },
]

const MAIN_NAV: NavItem[] = [
  { id: "home", label: "Home", icon: Home },
]

const CONTENT_NAV: NavItem[] = [
  { id: "shop", label: "Shop", icon: Store },
  { id: "skinchanger", label: "Skinchanger", icon: Paintbrush, badge: "new" },
  { id: "clan", label: "Clan", icon: Swords, badge: "new" },
]

const COMMUNITY_NAV: NavItem[] = [
  { id: "leaders", label: "Leaders", icon: Trophy },
  { id: "penalties", label: "Penalties", icon: Gavel },
  { id: "feedback", label: "Reviews", icon: MessageSquare },
  { id: "explore", label: "Explore", icon: Search },
]

function playSubItemAccent(id: PageId) {
  if (id === "play-5vs5") return "text-sky-300"
  if (id === "play-fun") return "text-pink-300"
  if (id === "play-proleague") return "text-white"
  return "text-amber-300"
}

function NavButton({ item, isActive, onClick }: { item: NavItem; isActive: boolean; onClick: () => void }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={item.label}
        onClick={onClick}
        className={cn(
          "text-sidebar-foreground h-9 transition-all duration-200",
          isActive && (item.id === "feedback" ? "text-amber-300" : "text-sidebar-accent-foreground")
        )}
      >
        <item.icon className={cn(
          "!size-[17px] shrink-0 transition-colors duration-200",
          isActive ? (item.id === "feedback" ? "text-amber-300" : "text-sidebar-accent-foreground") : "text-sidebar-foreground"
        )} />
        <span className="text-[13px]">{item.label}</span>
        {item.badge && (
          <SidebarMenuBadge>
            <span className="rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-bold text-sidebar-foreground">
              {item.badge}
            </span>
          </SidebarMenuBadge>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function AnimatedSubmenu({ open, children }: { open: boolean; children: React.ReactNode }) {
  const contentRef = useRef<HTMLUListElement>(null)
  const [height, setHeight] = useState(0)
  const [isVisible, setIsVisible] = useState(open)

  const measure = useCallback(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setIsVisible(true)
      requestAnimationFrame(measure)
    } else {
      setHeight(0)
      const timer = setTimeout(() => setIsVisible(false), 250)
      return () => clearTimeout(timer)
    }
  }, [open, measure])

  useEffect(() => {
    if (open && contentRef.current) {
      measure()
    }
  }, [open, measure])

  if (!isVisible && !open) return null

  return (
    <SidebarMenuSub
      ref={contentRef}
      className="submenu-animated overflow-hidden"
      style={{
        maxHeight: open ? `${height}px` : "0px",
        opacity: open ? 1 : 0,
      }}
    >
      {children}
    </SidebarMenuSub>
  )
}

export function AppSidebar({ currentPage, onNavigate }: AppSidebarProps) {
  const [playOpen, setPlayOpen] = useState(currentPage.startsWith("play-"))

  const isPlayActive = currentPage.startsWith("play-")
  const isActive = (id: PageId) => currentPage === id

  return (
    <Sidebar collapsible="icon" className="glass-sidebar border-sidebar-border">
      <SidebarContent className="gap-0 pt-3">
        {/* Main */}
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN_NAV.map((item) => (
                <NavButton key={item.id} item={item} isActive={isActive(item.id)} onClick={() => onNavigate(item.id)} />
              ))}

              {/* Play with animated dropdown */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isPlayActive}
                  tooltip="Play"
                  onClick={() => setPlayOpen((v) => !v)}
                  className={cn(
                    "text-sidebar-foreground h-9 transition-all duration-200",
                    isPlayActive && "text-amber-300"
                  )}
                >
                  <Play className={cn(
                    "!size-[17px] shrink-0 fill-current transition-all duration-200",
                    isPlayActive ? "text-amber-300" : "text-sidebar-foreground"
                  )} />
                  <span className="text-[13px]">Play</span>
                  <ChevronDown
                    className={cn(
                      "ml-auto !size-3.5 text-sidebar-foreground/50 transition-transform duration-250 ease-out",
                      playOpen && "rotate-180"
                    )}
                  />
                </SidebarMenuButton>
                <AnimatedSubmenu open={playOpen}>
                  {PLAY_SUB_ITEMS.map((item, i) => (
                    <SidebarMenuSubItem
                      key={item.id}
                      className="submenu-stagger-item"
                      style={{ transitionDelay: playOpen ? `${i * 40}ms` : "0ms" }}
                    >
                      <SidebarMenuSubButton
                        isActive={isActive(item.id)}
                        onClick={() => onNavigate(item.id)}
                        className={cn(
                          "text-sidebar-foreground transition-colors duration-200",
                          isActive(item.id) && playSubItemAccent(item.id)
                        )}
                      >
                        <item.icon className={cn(
                          "!size-[15px] shrink-0 transition-colors duration-200",
                          isActive(item.id) ? playSubItemAccent(item.id) : "text-sidebar-foreground"
                        )} />
                        <span className="text-[13px]">{item.label}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </AnimatedSubmenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Content */}
        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="text-sidebar-foreground/65 text-[10px] uppercase tracking-widest font-medium px-3">
            Content
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {CONTENT_NAV.map((item) => (
                <NavButton key={item.id} item={item} isActive={isActive(item.id)} onClick={() => onNavigate(item.id)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Community */}
        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="text-sidebar-foreground/65 text-[10px] uppercase tracking-widest font-medium px-3">
            Community
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {COMMUNITY_NAV.map((item) => (
                <NavButton key={item.id} item={item} isActive={isActive(item.id)} onClick={() => onNavigate(item.id)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 py-3 group-data-[collapsible=icon]:hidden">
        <div className="glass glow flex items-center justify-center rounded-lg px-3 py-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
            LegacyX
          </span>
          <span className="mx-1.5 text-sidebar-foreground/20">·</span>
          <span className="text-[10px] font-bold tabular-nums text-sidebar-foreground/75">
            v1.0
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
