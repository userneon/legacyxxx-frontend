import { Code2, Palette, Shield, Gem, ShieldUser } from "lucide-react"

import type { UserProfile } from "@/api/types"
import { cn } from "@/lib/utils"

type ProfileRole = UserProfile["role"]
type StaffRole = Exclude<ProfileRole, "Player">

const ROLE_META: Record<StaffRole, { className: string; icon: typeof Gem }> = {
  Owner: { className: "border-amber-300/40 bg-amber-300/[0.12] text-amber-200 shadow-[0_0_14px_rgba(252,211,77,0.18)]", icon: Gem },
  Founder: { className: "border-amber-300/40 bg-amber-300/[0.12] text-amber-200 shadow-[0_0_14px_rgba(252,211,77,0.18)]", icon: Gem },
  Manager: { className: "border-sky-300/35 bg-sky-300/[0.10] text-sky-200", icon: Shield },
  Admin: { className: "border-sky-300/35 bg-sky-300/[0.10] text-sky-200", icon: ShieldUser },
  Designer: { className: "border-fuchsia-300/35 bg-fuchsia-300/[0.10] text-fuchsia-200", icon: Palette },
  Developer: { className: "border-emerald-300/35 bg-emerald-300/[0.10] text-emerald-200", icon: Code2 },
}

/** LEGACY-X staff badge next to the profile name; regular players get none. */
export function ProfileRoleIcon({ role = "Player", className }: { role?: ProfileRole; className?: string }) {
  if (role === "Player" || !(role in ROLE_META)) return null
  const meta = ROLE_META[role as StaffRole]
  const Icon = meta.icon
  return (
    <span
      aria-label={`LEGACY-X ${role}`}
      className={cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-bold uppercase tracking-[0.12em]", meta.className, className)}
    >
      <Icon className="size-3.5" />
      {role}
    </span>
  )
}
