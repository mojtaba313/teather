import * as React from "react"
import { cn } from "@/src/lib/utils"

const variants = {
  default: "bg-neutral-900/90 text-white shadow-md shadow-neutral-900/10 hover:bg-neutral-900 hover:shadow-lg hover:shadow-neutral-900/20 active:scale-[0.97]",
  destructive: "bg-red-600/90 text-white shadow-md shadow-red-600/10 hover:bg-red-600 hover:shadow-lg hover:shadow-red-600/20 active:scale-[0.97]",
  outline: "border border-neutral-200 bg-white/60 shadow-sm hover:bg-white hover:shadow-md active:scale-[0.97]",
  secondary: "bg-neutral-100/80 text-neutral-900 shadow-sm hover:bg-neutral-100 hover:shadow-md active:scale-[0.97]",
  ghost: "hover:bg-neutral-100/60 active:scale-[0.97]",
  link: "text-neutral-900 underline-offset-4 hover:underline",
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
