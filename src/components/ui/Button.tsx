import * as React from "react"
import { cn } from "@/src/lib/utils"

const variants = {
  default: "bg-neutral-900 text-white shadow hover:bg-neutral-700",
  destructive: "bg-red-600 text-white shadow-sm hover:bg-red-500",
  outline: "border border-neutral-300 bg-white shadow-sm hover:bg-neutral-100",
  secondary: "bg-neutral-100 text-neutral-900 shadow-sm hover:bg-neutral-200",
  ghost: "hover:bg-neutral-100",
  link: "text-neutral-900 underline-offset-4 hover:underline",
} as const

const sizes = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8",
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
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
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
