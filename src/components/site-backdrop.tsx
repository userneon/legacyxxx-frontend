import RbSideRays from "@/components/reactbits/bg/SideRays"
import { LightRays } from "@/components/site-bg-options/light-rays"

/**
 * The website's background when it is a real component (React Bits, Magic UI), picked with ?site= (owner 2026-11-21, "7 and 3"): it sits behind the page inside the shell
 * (z-index -1 in the shell's own stacking context, so the content stays above it). The CSS backgrounds (foil, calm, ...) are not touched.
 */
export function SiteBackdrop() {
  const kind = typeof document === "undefined" ? "" : document.documentElement.dataset.siteBg
  if (kind !== "siderays" && kind !== "lightrays") return null
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
      {kind === "siderays" && <RbSideRays />}
      {kind === "lightrays" && <LightRays count={9} color="rgba(190,210,255,0.30)" blur={44} speed={16} length="90vh" />}
    </div>
  )
}
