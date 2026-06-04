import { auth } from "@/src/lib/auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Clapperboard, LogOut } from "lucide-react"

export async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
            <Clapperboard className="h-5 w-5" />
            تیاتر
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-500">{session.user.name}</span>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800"
              >
                <LogOut className="h-4 w-4" />
                خروج
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl p-4">{children}</main>
    </div>
  )
}
