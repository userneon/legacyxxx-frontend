/** The Verified Clan mark: ten or more members, every one with Discord linked. The API decides (`verified`); the picture is a mask, so it takes the text colour round it. */
export function VerifiedClan({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Verified clan: 10 or more members, all with Discord linked"
      title="Verified clan · 10 or more members, all with Discord linked"
      className={`inline-block size-[18px] shrink-0 bg-[var(--status-green)] ${className ?? ""}`}
      style={{ WebkitMaskImage: "url(/verified-clan.webp)", maskImage: "url(/verified-clan.webp)", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center", WebkitMaskSize: "contain", maskSize: "contain" }}
    />
  )
}
