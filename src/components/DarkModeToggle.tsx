"use client"

import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

export function DarkModeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"))
    setMounted(true)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
  }

  if (!mounted) {
    return <div className="h-9 w-9" />
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--badge-bg)] text-[var(--muted)] shadow-sm transition-all duration-200 hover:bg-[var(--card-bg)] hover:text-[var(--foreground)] hover:shadow-md active:scale-90"
      aria-label={dark ? "حالت روشن" : "حالت تاریک"}
    >
      <div className="transition-transform duration-500 ease-spring rotate-0 scale-100 dark:-rotate-90 dark:scale-0">
        <Sun className="h-4 w-4" />
      </div>
      <div className="absolute transition-transform duration-500 ease-spring rotate-90 scale-0 dark:rotate-0 dark:scale-100">
        <Moon className="h-4 w-4" />
      </div>
    </button>
  )
}
