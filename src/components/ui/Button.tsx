import * as React from "react"
import { cn } from "@/src/lib/utils"

const variants = {
  default:
    "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-md shadow-[var(--card-shadow)] hover:shadow-lg hover:shadow-[var(--card-hover-shadow)] active:scale-[0.97]",
  destructive:
    "bg-[var(--destructive)] text-[var(--destructive-foreground)] shadow-md shadow-[var(--card-shadow)] hover:shadow-lg active:scale-[0.97]",
  outline:
    "border border-[var(--input-border)] bg-[var(--glass-bg)] shadow-sm hover:bg-[var(--card-bg)] hover:shadow-md active:scale-[0.97]",
  secondary:
    "bg-[var(--badge-bg)] text-[var(--foreground)] shadow-sm hover:shadow-md active:scale-[0.97]",
  ghost:
    "hover:bg-[var(--badge-bg)] active:scale-[0.97] text-[var(--muted)] hover:text-[var(--foreground)]",
  link:
    "text-[var(--foreground)] underline-offset-4 hover:underline",
} as const

const sizes = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-lg px-3 text-xs",
  lg: "h-10 rounded-xl px-8",
  icon: "h-9 w-9",
} as const

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
