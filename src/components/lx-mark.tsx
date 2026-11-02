/** The LX currency mark: the owner-supplied gold coin (owner request 2026-11-02, `public/lx-coin.webp`). Used next to every LX amount that wants a mark. */
export function LxMark({ size = 20, className }: { size?: number; className?: string }) {
  return <img src="/lx-coin.webp" alt="" width={size} height={size} className={className} style={{ width: size, height: size }} draggable={false} aria-hidden="true" />
}
