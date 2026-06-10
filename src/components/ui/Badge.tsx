import { cn } from "@/src/lib/utils"

const variantStyles: Record<string, string> = {
  default: "bg-[var(--badge-bg)] text-[var(--badge-text)]",
  outline: "border border-[var(--input-border)] text-[var(--muted)] bg-transparent",
  success: "bg-[var(--green-bg)] border border-[var(--green-border)] text-[var(--green-text)]",
  warning: "bg-[var(--amber-bg)] border border-[var(--amber-border)] text-[var(--amber-text)]",
  destructive: "bg-[var(--red-bg)] border border-[var(--red-border)] text-[var(--red-text)]",
}

export function Badge({
  className,
  children,
  variant = "default",
}: {
  className?: string
  children: React.ReactNode
  variant?: "default" | "outline" | "success" | "warning" | "destructive"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm transition-colors duration-200",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
