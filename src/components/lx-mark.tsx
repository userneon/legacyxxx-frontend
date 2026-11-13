/** The LX currency mark. The coin picture is gone everywhere (owner request 2026-11-13, "remove the LX coin logo from all places"); an amount that wanted a mark now carries the plain letters "LX". */
export function LxMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span aria-hidden="true" className={["lx-mark", className].filter(Boolean).join(" ")} style={{ fontSize: Math.max(10, Math.min(13, Math.round(size * 0.62))), fontWeight: 700, letterSpacing: "0.04em", opacity: 0.75, lineHeight: 1 }}>FOL$</span>
  )
}
