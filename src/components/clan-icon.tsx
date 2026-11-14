/** The clan icon (a banner with a crown): a picture used as a mask, so it takes the colour of the text round it like the lucide icons do. */
export function ClanIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`lx-mask-icon inline-block shrink-0 bg-current ${className ?? ""}`}
      style={{ WebkitMaskImage: "url(/clan-icon.webp)", maskImage: "url(/clan-icon.webp)", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center", WebkitMaskSize: "contain", maskSize: "contain" }}
    />
  )
}
