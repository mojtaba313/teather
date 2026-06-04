import { cn } from "@/src/lib/utils"

export function Badge({ className, children, variant = "default" }: { className?: string; children: React.ReactNode; variant?: "default" | "outline" | "success" | "warning" | "destructive" }) {
  const variants: Record<string, string> = {
    default: "bg-neutral-100 text-neutral-800",
    outline: "border border-neutral-300 text-neutral-600",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    destructive: "bg-red-100 text-red-800",
  }
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm", variants[variant], className)}>
      {children}
    </span>
  )
}
