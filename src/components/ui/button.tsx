import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Legacy-X buttons. `default` is the white primary (one per page at most); `secondary` is the raised action
 * (e.g. Connect); `outline` the quiet bordered action; `ghost` for icon/menu actions.
 * Hover changes color in 150ms, press scales to 0.98, disabled is 50% with no motion.
 */
const buttonVariants = cva(
  "press inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium outline-none transition-[background-color,border-color,color,transform] duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-accent font-semibold text-accent-contrast hover:bg-[#e5e5e5]",
        secondary: "border border-line-strong bg-line-soft font-semibold text-text hover:bg-line",
        outline: "border border-line bg-transparent text-text hover:border-line-strong hover:bg-raised",
        ghost: "text-text-muted hover:bg-raised hover:text-text",
        destructive: "border border-line bg-transparent text-text hover:border-line-strong hover:bg-raised",
        link: "text-text underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[34px] rounded-lg px-3 text-[13px]",
        xs: "h-6 gap-1 rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-lg px-3 text-[13px]",
        lg: "h-11 rounded-[10px] px-[22px] text-[15px]",
        icon: "size-[34px] rounded-lg",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-10 rounded-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
