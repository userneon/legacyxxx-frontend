import type { SVGProps } from "react"

/**
 * Combat knife glyph for Skinchanger (owner-supplied design): serrated spine, a thin edge line,
 * cross guard and a banded grip, pointing up-right. Drawn flat on a 24px grid and filled with
 * currentColor, so it sizes and colours like the lucide icons next to it.
 */
export function KnifeIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} {...props}>
      {/* Laid out horizontally, then turned 45° and scaled to fit the square. */}
      <g transform="rotate(-45 12 12) translate(12 12) scale(0.88) translate(-12.3 -11.4)">
        {/* Grip: three bands */}
        <rect x="-3.5" y="9.6" width="3.2" height="4.8" rx="0.3" />
        <rect x="0.5" y="9.6" width="2.6" height="4.8" rx="0.2" />
        <rect x="3.9" y="9.6" width="2.6" height="4.8" rx="0.2" />
        {/* Cross guard */}
        <rect x="7.1" y="7.8" width="1.3" height="8.4" rx="0.3" />
        {/* Blade with a serrated spine */}
        <path d="M8.9 9.6H11V8.7H12.4V9.6H14.6V8.7H16V9.6H18.2V8.7H19.6V9.6H21.4L22.6 8.5L28 8.3Q26.2 12.5 20.8 12.8H8.9Z" />
        {/* Edge line along the belly, meeting the tip */}
        <path d="M8.9 13.5H20.9Q26.4 13.3 28.4 8.3Q27.6 14.1 21 14.4H8.9Z" />
      </g>
    </svg>
  )
}
