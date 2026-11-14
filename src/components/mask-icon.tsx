/** An icon drawn from a picture used as a mask, so it takes the colour of the text round it like the lucide icons do. */
export function MaskIcon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`lx-mask-icon inline-block shrink-0 bg-current ${className ?? ""}`}
      style={{ WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`, WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center", WebkitMaskSize: "contain", maskSize: "contain" }}
    />
  )
}

export const CompareIcon = ({ className }: { className?: string }) => <MaskIcon src="/compare-icon.webp" className={className} />
export const LeaderIcon = ({ className }: { className?: string }) => <MaskIcon src="/clan-leader.webp" className={className} />
export const LeadersIcon = ({ className }: { className?: string }) => <MaskIcon src="/leaders-icon.webp" className={className} />
export const CommunityIcon = ({ className }: { className?: string }) => <MaskIcon src="/community-icon.webp" className={className} />
export const ReviewsIcon = ({ className }: { className?: string }) => <MaskIcon src="/reviews-icon.webp" className={className} />
export const PlayIcon = ({ className }: { className?: string }) => <MaskIcon src="/play-icon.webp" className={className} />
export const PenaltiesIcon = ({ className }: { className?: string }) => <MaskIcon src="/penalties-icon.webp" className={className} />
export const HomeIcon = ({ className }: { className?: string }) => <MaskIcon src="/home-icon.webp" className={className} />
export const ShopIcon = ({ className }: { className?: string }) => <MaskIcon src="/shop-icon.webp" className={className} />
export const ExploreIcon = ({ className }: { className?: string }) => <MaskIcon src="/explore-icon.webp" className={className} />
