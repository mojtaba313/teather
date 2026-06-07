"use client"

import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

function getInitialTheme(): boolean {
  if (typeof window === "undefined") return false
  const stored = localStorage.getItem("theme")
  if (stored) return stored === "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function DarkModeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setDark(getInitialTheme())
    setMounted(true)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    const theme = next ? "dark" : "light"
    localStorage.setItem("theme", theme)
    document.documentElement.classList.toggle("dark", next)
    document.documentElement.style.setProperty("color-scheme", theme)
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
      <div
        className={`absolute transition-all duration-500 ${
          dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
      >
        <Sun className="h-4 w-4" />
      </div>
      <div
        className={`absolute transition-all duration-500 ${
          dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        }`}
      >
        <Moon className="h-4 w-4" />
      </div>
    </button>
  )
}
