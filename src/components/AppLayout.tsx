import { auth } from "@/src/lib/auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Clapperboard, LogOut } from "lucide-react"
import { DarkModeToggle } from "./DarkModeToggle"
import { MobileMenuButton, MobileMenuPanel } from "./MobileMenu"

export async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="relative min-h-screen" dir="rtl">
      <div className="decorative-blur -top-40 -right-40 h-80 w-80 bg-[var(--blur-circle-1)]" />
      <div className="decorative-blur -bottom-40 -left-40 h-80 w-80 bg-[var(--blur-circle-2)]" />
      <div className="decorative-blur top-1/2 left-1/3 h-60 w-60 bg-[var(--blur-circle-3)]" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <MobileHeader userName={session.user.name ?? ""} />
        <header className="sticky top-0 z-50 hidden md:flex border-b border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl shadow-sm">
          <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-6">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2 text-lg font-bold tracking-tight transition-all duration-200 hover:opacity-80"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm transition-transform duration-200 group-hover:scale-105">
                <Clapperboard className="h-4 w-4" />
              </div>
              <span>تیاتر</span>
            </Link>
            <div className="flex items-center gap-3">
              <DarkModeToggle />
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--badge-bg)] text-xs font-medium text-[var(--muted)]">
                {session.user.name?.charAt(0)}
              </div>
              <span className="text-sm text-[var(--muted)]">{session.user.name}</span>
              <div className="mx-2 h-5 w-px bg-[var(--input-border)]" />
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm text-[var(--muted)] transition-all duration-200 hover:bg-[var(--badge-bg)] hover:text-[var(--foreground)]"
                >
                  <LogOut className="h-4 w-4" />
                  خروج
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="relative z-10 flex-1 mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}

function MobileHeader({ userName }: { userName: string }) {
  return (
    <header className="sticky top-0 z-50 flex md:hidden border-b border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl shadow-sm">
      <div className="flex h-14 w-full items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-base font-bold"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)]">
            <Clapperboard className="h-3.5 w-3.5" />
          </div>
          <span>تیاتر</span>
        </Link>
        <div className="flex items-center gap-2">
          <DarkModeToggle />
          <MobileMenuButton />
          <MobileMenuPanel userName={userName} />
        </div>
      </div>
    </header>
  )
}
