import * as React from "react"
import { cn } from "@/src/lib/utils"

const variants = {
  default:
    "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm shadow-[var(--card-shadow)] hover:bg-[var(--accent-hover)] hover:shadow-md active:scale-[0.97] transition-all duration-150",
  destructive:
    "bg-[var(--destructive)] text-[var(--destructive-foreground)] shadow-sm shadow-[var(--card-shadow)] hover:opacity-90 hover:shadow-md active:scale-[0.97]",
  outline:
    "border border-[var(--input-border)] bg-[var(--card-bg)] shadow-sm hover:bg-white hover:border-[var(--accent)]/30 hover:shadow-md active:scale-[0.97] dark:hover:bg-white/5",
  secondary:
    "bg-[var(--badge-bg)] text-[var(--foreground)] shadow-sm hover:bg-[var(--accent-light)] hover:shadow-md active:scale-[0.97]",
  ghost:
    "hover:bg-[var(--accent-light)] active:scale-[0.97] text-[var(--muted)] hover:text-[var(--accent)]",
  link:
    "text-[var(--accent)] underline-offset-4 hover:underline hover:text-[var(--accent-hover)]",
} as const

const sizes = {
  default: "h-10 px-5 py-2",
  sm: "h-8 rounded-lg px-3 text-xs",
  lg: "h-11 rounded-xl px-8",
  icon: "h-10 w-10",
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
