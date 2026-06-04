import { auth } from "@/src/lib/auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Clapperboard, LogOut } from "lucide-react"
import { DarkModeToggle } from "./DarkModeToggle"

export async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/60 backdrop-blur-xl shadow-sm shadow-neutral-900/5 dark:border-neutral-800/50 dark:bg-neutral-900/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg transition-opacity hover:opacity-70">
            <Clapperboard className="h-5 w-5" />
            تیاتر
          </Link>
          <div className="flex items-center gap-4">
            <DarkModeToggle />
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{session.user.name}</span>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                <LogOut className="h-4 w-4" />
                خروج
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl p-4 animate-fade-in">{children}</main>
    </div>
  )
}
