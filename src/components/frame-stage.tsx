import { cn } from "@/lib/utils"

/**
 * The stage a frame stands on in the Shop (owner request 2026-11-15, "do the frames"): a soft light in the frame's own colour, two isometric glass plates under it
 * and the picture lifted a little above, so the frames tell apart at a glance and look like products, not a row of small rings.
 */
export function FrameStage({ accent, height, children, className }: { accent: string; height: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("group/stage relative isolate flex items-center justify-center overflow-hidden", className)} style={{ height, "--acc": accent } as React.CSSProperties}>
      <span aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(62% 72% at 50% 58%, color-mix(in srgb, var(--acc) 34%, transparent), transparent 76%)" }} />
      <div aria-hidden="true" className="absolute left-1/2 top-[66%] size-0 [perspective:700px] [transform-style:preserve-3d]">
        {[0, 12].map((z, i) => (
          <span
            key={z}
            className="absolute -left-[54px] -top-[54px] size-[108px] rounded-[20px] border transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none"
            style={{ opacity: i ? 0.95 : 0.5, borderColor: "color-mix(in srgb, var(--acc) 55%, transparent)", background: "linear-gradient(135deg, color-mix(in srgb, var(--acc) 16%, transparent), transparent)", transform: `rotateX(62deg) rotateZ(-45deg) translateZ(${z}px)` }}
          />
        ))}
      </div>
      <div className="relative z-[1] -translate-y-1 drop-shadow-[0_12px_14px_rgba(0,0,0,0.6)]">{children}</div>
    </div>
  )
}
