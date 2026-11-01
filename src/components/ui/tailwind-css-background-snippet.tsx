import { cn } from "@/lib/utils";

/**
 * A full-screen radial-gradient backdrop: black fading into the brand violet at the bottom.
 * The original snippet used the off-palette `#63e`; it uses `--brand` here so the site's colour check passes.
 * It is not placed on any page yet (CLAUDE.md: no page but Home and the Shop has a glow or hero).
 */
export const Hero = ({ className }: { className?: string }) => {
  return (
    <div className={cn("w-full relative h-screen", className)}>
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 -z-10 h-full w-full items-center px-5 py-24 [background:radial-gradient(125%_125%_at_50%_10%,#000_40%,var(--brand)_100%)]"></div>
      </div>
    </div>
  );
};
