import { getAuth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { redirect } from "next/navigation"
import { AppLayout } from "@/src/components/AppLayout"
import { Users, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { UserManagement } from "./user-management"

export default async function AdminUsersPage() {
  const session = await getAuth()
  if (!session?.user?.id) redirect("/login")

  const isDirector = await prisma.projectMember.findFirst({
    where: { userId: session.user.id, roles: { has: "director" } },
  })
  if (!isDirector) redirect("/dashboard")

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { memberships: true } },
    },
  })

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6 md:space-y-8">
        <div className="animate-fade-in">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            بازگشت به داشبورد
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--badge-bg)]">
              <Users className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">مدیریت کاربران</h1>
              <p className="text-sm text-[var(--muted)] mt-1">{users.length} کاربر</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 animate-fade-in-1">
          <UserManagement users={JSON.parse(JSON.stringify(users))} currentUserId={session.user.id} />
        </div>
      </div>
    </AppLayout>
  )
}
