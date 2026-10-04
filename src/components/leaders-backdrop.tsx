import "./leaders-backdrop.css"

/**
 * The Leaders page's own light: a main spotlight over the #1 card, two fainter ones over #2 and #3, a crimson pool where
 * the light lands and a few specks of dust drifting up through it. It sits behind the page content and never takes input.
 */
const SPECKS = Array.from({ length: 16 }, (_, i) => ({
  x: 36 + ((i * 37) % 28),
  y: 300 + ((i * 53) % 220),
  s: 1.5 + (i % 3) * 0.7,
  d: 8 + ((i * 7) % 6),
  delay: -((i * 11) % 12),
  dx: ((i % 5) - 2) * 8,
}))

export function LeadersBackdrop() {
  return (
    <div className="lx-lb" aria-hidden="true">
      {/* Three nested layers of the same cone, so its sides fade out instead of ending on a hard edge. */}
      {[[780, 0.07], [600, 0.09], [420, 0.12]].map(([width, alpha]) => (
        <div key={width} className="lx-lb-cone" style={{ "--w": `${width}px`, "--h": "720px", "--a": alpha, "--sway": "12s", "--breathe": "6s" } as React.CSSProperties} />
      ))}
      <div className="lx-lb-cone" style={{ "--w": "460px", "--h": "620px", "--a": 0.1, "--shift": "-30vw", "--sway": "15s", "--breathe": "8s", "--delay": "-4s" } as React.CSSProperties} />
      <div className="lx-lb-cone" style={{ "--w": "460px", "--h": "620px", "--a": 0.1, "--shift": "30vw", "--sway": "14s", "--breathe": "7s", "--delay": "-9s" } as React.CSSProperties} />
      <div className="lx-lb-pool" />
      {SPECKS.map((speck, index) => (
        <span key={index} className="lx-lb-speck" style={{ "--x": `${speck.x}%`, "--y": `${speck.y}px`, "--s": `${speck.s}px`, "--d": `${speck.d}s`, "--delay": `${speck.delay}s`, "--dx": `${speck.dx}px` } as React.CSSProperties} />
      ))}
    </div>
  )
}
