import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/src/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { Badge } from "@/src/components/ui/Badge"
import { Plus } from "lucide-react"

const statusMap: Record<string, string> = {
  IDEA: "ایده",
  PRE_PRODUCTION: "پیش‌تولید",
  REHEARSAL: "تمرین",
  PERFORMANCE: "اجرا",
  ARCHIVED: "بایگانی",
}

const roleLabels: Record<string, string> = {
  writer: "نویسنده",
  director: "کارگردان",
  actor: "بازیگر",
  stage_manager: "مدیر صحنه",
  viewer: "بیننده",
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const memberships = await prisma.projectMember.findMany({
    where: { userId: session.user.id },
    include: { project: true },
    orderBy: { project: { updatedAt: "desc" } },
  })

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">داشبورد</h1>
            <p className="text-sm text-neutral-500 mt-1">خوش آمدید، {session.user.name}</p>
          </div>
          <Link href="/projects/new">
            <Button><Plus className="ml-2 h-4 w-4" />پروژه جدید</Button>
          </Link>
        </div>

        {memberships.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-neutral-500 mb-4">هنوز در هیچ پروژه‌ای عضو نیستید</p>
              <Link href="/projects/new"><Button>ساخت اولین پروژه</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {memberships.map((m: { id: string; project: { id: string; title: string; status: string; description: string | null; updatedAt: Date }; roles: string[] }) => (
              <Link key={m.id} href={`/projects/${m.project.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{m.project.title}</CardTitle>
                      <Badge>{statusMap[m.project.status] || m.project.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {m.project.description && (
                      <p className="text-sm text-neutral-500 mb-3 line-clamp-2">{m.project.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {m.roles.map((role) => (
                        <span key={role} className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                          {roleLabels[role] || role}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
