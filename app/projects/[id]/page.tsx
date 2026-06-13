import { getAuth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/src/components/AppLayout"
import { Card, CardContent } from "@/src/components/ui/Card"
import { Badge } from "@/src/components/ui/Badge"
import { Button } from "@/src/components/ui/Button"
import { hasAnyRole } from "@/src/lib/roles"
import { FileText, Users, Clapperboard, Calendar, CalendarCheck, Settings, BookOpen, ArrowLeft } from "lucide-react"

const statusMap: Record<string, string> = {
  IDEA: "ایده",
  PRE_PRODUCTION: "پیش‌تولید",
  REHEARSAL: "تمرین",
  PERFORMANCE: "اجرا",
  ARCHIVED: "بایگانی",
}

const statusVariants: Record<string, "default" | "outline" | "success" | "warning" | "destructive"> = {
  IDEA: "default",
  PRE_PRODUCTION: "outline",
  REHEARSAL: "warning",
  PERFORMANCE: "success",
  ARCHIVED: "destructive",
}

const statIcons = [FileText, Users, Calendar, CalendarCheck]

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
  const session = await getAuth()
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

  const stats = [
    { label: "شخصیت‌ها", value: project._count.characters, icon: statIcons[0] },
    { label: "تمرینات", value: project._count.rehearsals, icon: statIcons[1] },
    { label: "اجراها", value: project._count.performances, icon: statIcons[2] },
    { label: "اعضا", value: project._count.members, icon: statIcons[3] },
  ]

  return (
    <AppLayout>
      <div className="space-y-6 md:space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            بازگشت به داشبورد
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{project.title}</h1>
                <Badge variant={statusVariants[project.status] || "default"}>
                  {statusMap[project.status] || project.status}
                </Badge>
              </div>
              {project.description && (
                <p className="text-[var(--muted)] mt-1">{project.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 animate-fade-in-1">
          {tabs.filter((t) => t.enabled).map((tab) => (
            <Link key={tab.href} href={tab.href}>
              <Button variant="outline" size="sm" className="gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Button>
            </Link>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 animate-fade-in-2">
          {stats.map((stat, i) => (
            <Card key={stat.label} className={`animate-fade-in-${i + 3}`}>
              <CardContent className="p-4 md:p-5 flex items-center gap-3 md:gap-4">
                <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--badge-bg)]">
                  <stat.icon className="h-5 w-5 md:h-6 md:w-6 text-[var(--muted)]" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-[var(--muted)]">{stat.label}</p>
                  <p className="text-xl md:text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
