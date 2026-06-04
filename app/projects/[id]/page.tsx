import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/src/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { Badge } from "@/src/components/ui/Badge"
import { Button } from "@/src/components/ui/Button"
import { hasAnyRole } from "@/src/lib/roles"
import { FileText, Users, Clapperboard, Calendar, CalendarCheck, Settings, BookOpen } from "lucide-react"

const statusMap: Record<string, string> = {
  IDEA: "ایده",
  PRE_PRODUCTION: "پیش‌تولید",
  REHEARSAL: "تمرین",
  PERFORMANCE: "اجرا",
  ARCHIVED: "بایگانی",
}

async function getProject(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  })
  if (!member) return null

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      _count: { select: { characters: true, rehearsals: true, performances: true, members: true } },
    },
  })
  return { project, roles: member.roles }
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { id } = await params
  const data = await getProject(id, session.user.id)
  if (!data) notFound()

  const { project, roles } = data
  if (!project) notFound()
  const canWrite = hasAnyRole(roles, ["writer", "director"])
  const canDirect = hasAnyRole(roles, ["director", "stage_manager"])

  const tabs = [
    { href: `/projects/${id}/script`, label: "فیلمنامه", icon: FileText, enabled: canWrite },
    { href: `/projects/${id}/characters`, label: "شخصیت‌ها", icon: Users, enabled: canWrite },
    { href: `/projects/${id}/casting`, label: "انتخاب بازیگر", icon: Clapperboard, enabled: canDirect },
    { href: `/projects/${id}/rehearsals`, label: "تمرینات", icon: Calendar, enabled: canDirect },
    { href: `/projects/${id}/performances`, label: "اجراها", icon: CalendarCheck, enabled: canDirect },
    { href: `/projects/${id}/my-roles`, label: "نقش‌های من", icon: BookOpen, enabled: roles.includes("actor") },
    { href: `/projects/${id}/settings`, label: "تنظیمات", icon: Settings, enabled: canDirect },
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{project.title}</h1>
              <Badge>{statusMap[project.status] || project.status}</Badge>
            </div>
            {project.description && <p className="text-neutral-500 mt-1">{project.description}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b pb-4">
          {tabs.filter(t => t.enabled).map((tab) => (
            <Link key={tab.href} href={tab.href}>
              <Button variant="outline" size="sm" className="gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Button>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader><CardTitle className="text-sm text-neutral-500">شخصیت‌ها</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{project._count.characters}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm text-neutral-500">تمرینات</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{project._count.rehearsals}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm text-neutral-500">اجراها</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{project._count.performances}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm text-neutral-500">اعضا</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{project._count.members}</p></CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
