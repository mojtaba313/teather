"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function DarkModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && (theme === "dark" || resolvedTheme === "dark")

  if (!mounted) {
    return <div className="h-9 w-9" />
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--badge-bg)] text-[var(--muted)] shadow-sm transition-all duration-200 hover:bg-[var(--card-bg)] hover:text-[var(--foreground)] hover:shadow-md active:scale-90"
      aria-label={isDark ? "حالت روشن" : "حالت تاریک"}
    >
      <div
        className={`absolute transition-all duration-500 ${
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
      >
        <Sun className="h-4 w-4" />
      </div>
      <div
        className={`absolute transition-all duration-500 ${
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        }`}
      >
        <Moon className="h-4 w-4" />
      </div>
    </button>
  )
}
