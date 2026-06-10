"use client"

import { Menu, LogOut, Clapperboard, Users } from "lucide-react"
import { signOutAction } from "@/src/actions/auth"
import Link from "next/link"

export function MobileMenuButton() {
  return (
    <button
      type="button"
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--badge-bg)] text-[var(--muted)] transition-colors hover:bg-[var(--card-bg)]"
      onClick={() => {
        const menu = document.getElementById("mobile-menu")
        if (menu) menu.classList.toggle("hidden")
      }}
      aria-label="منو"
    >
      <Menu className="h-4 w-4" />
    </button>
  )
}

export function MobileMenuPanel({ userName, isAdmin }: { userName: string; isAdmin?: boolean }) {
  return (
    <div
      id="mobile-menu"
      className="fixed inset-0 z-50 hidden flex-col bg-[var(--bg-gradient)] p-4 animate-fade-in-down"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2 text-base font-bold">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)]">
            <Clapperboard className="h-3.5 w-3.5" />
          </div>
          <span>تیاتر</span>
        </div>
        <MobileMenuButton />
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] p-4 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--badge-bg)] text-sm font-medium text-[var(--muted)]">
          {userName?.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-medium">{userName}</p>
          <p className="text-xs text-[var(--muted)]">پنل کاربری</p>
        </div>
      </div>
      {isAdmin && (
        <Link
          href="/admin/users"
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--badge-bg)] hover:text-[var(--foreground)]"
          onClick={() => {
            const menu = document.getElementById("mobile-menu")
            if (menu) menu.classList.add("hidden")
          }}
        >
          <Users className="h-4 w-4" />
          مدیریت کاربران
        </Link>
      )}
      <form action={signOutAction} className="mt-auto">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--badge-bg)] px-4 py-3 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--red-bg)] hover:text-[var(--red-text)]"
        >
          <LogOut className="h-4 w-4" />
          خروج از حساب
        </button>
      </form>
    </div>
  )
}
