import { cn } from "@/lib/utils"

/** An on/off switch: the knob springs across and stretches a little on the way. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange?: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "group",
        "relative h-6 w-[42px] shrink-0 rounded-full p-0.5 transition-[background-color,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50 disabled:cursor-default disabled:opacity-50",
        checked ? "bg-[linear-gradient(180deg,var(--brand-bright),var(--brand))]" : "bg-[var(--line-strong)]",
      )}
    >
      {/* The knob springs across and stretches a little on the way. */}
      <span className={cn("block size-5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.35)] transition-[translate,width] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none group-active:w-6", checked ? "translate-x-[18px]" : "translate-x-0")} />
    </button>
  )
}
