import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/src/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { Badge } from "@/src/components/ui/Badge"
import { Plus, Theater, Users, Calendar, CalendarCheck, ArrowLeft, KeyRound } from "lucide-react"
import { ChangePasswordSection } from "./change-password"

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

const roleLabels: Record<string, string> = {
  writer: "نویسنده",
  director: "کارگردان",
  actor: "بازیگر",
  stage_manager: "مدیر صحنه",
  viewer: "بیننده",
}

const roleColors: Record<string, string> = {
  writer: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/10 dark:text-purple-400",
  director: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/10 dark:text-blue-400",
  actor: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/10 dark:text-green-400",
  stage_manager: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/10 dark:text-amber-400",
  viewer: "border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/30 dark:text-neutral-400",
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const memberships = await prisma.projectMember.findMany({
    where: { userId: session.user.id },
    include: { project: true },
    orderBy: { project: { updatedAt: "desc" } },
  })

  const totalProjects = memberships.length
  const activeProjects = memberships.filter((m) => m.project.status !== "ARCHIVED").length

  return (
    <AppLayout>
      <div className="space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">داشبورد</h1>
            <p className="text-[var(--muted)] mt-1">
              خوش آمدید، <span className="font-medium text-[var(--foreground)]">{session.user.name}</span>
            </p>
          </div>
          <Link href="/projects/new">
            <Button className="w-full sm:w-auto gap-2">
              <Plus className="h-4 w-4" />
              پروژه جدید
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 animate-fade-in-1">
          <StatCard icon={Theater} label="کل پروژه‌ها" value={totalProjects} delay="1" />
          <StatCard icon={Calendar} label="پروژه‌های فعال" value={activeProjects} delay="2" />
          <StatCard icon={CalendarCheck} label="...بزودی" value={0} delay="3" />
          <StatCard icon={Users} label="...بزودی" value={0} delay="4" />
        </div>

        {/* Projects */}
        <div className="animate-fade-in-2">
          <h2 className="text-lg font-semibold mb-4">پروژه‌های من</h2>
          {memberships.length === 0 ? (
            <Card>
              <CardContent className="py-12 md:py-16 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--badge-bg)]">
                    <Theater className="h-7 w-7 text-[var(--muted)]" />
                  </div>
                  <div>
                    <p className="text-[var(--muted)] mb-1">هنوز در هیچ پروژه‌ای عضو نیستید</p>
                    <p className="text-xs text-[var(--muted-foreground)]">یک پروژه جدید بسازید یا توسط مدیر به پروژه اضافه شوید</p>
                  </div>
                  <Link href="/projects/new">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      ساخت اولین پروژه
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {memberships.map((m, i) => (
                <Link key={m.id} href={`/projects/${m.project.id}`} className={`animate-fade-in-${Math.min(i + 1, 8)}`}>
                  <Card className="group h-full cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg group-hover:text-[var(--accent)] transition-colors">
                          {m.project.title}
                        </CardTitle>
                        <Badge variant={statusVariants[m.project.status] || "default"}>
                          {statusMap[m.project.status] || m.project.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {m.project.description && (
                        <p className="text-sm text-[var(--muted)] mb-4 line-clamp-2">
                          {m.project.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {m.roles.map((role) => (
                          <span
                            key={role}
                            className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${roleColors[role] || ""}`}
                          >
                            {roleLabels[role] || role}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center gap-1 text-xs text-[var(--muted-foreground)] group-hover:text-[var(--muted)] transition-colors">
                        <ArrowLeft className="h-3 w-3" />
                        ورود به پروژه
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="animate-fade-in-3">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[var(--muted)]" />
                <CardTitle>تغییر رمز عبور</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ChangePasswordSection />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: React.ElementType
  label: string
  value: number
  delay: string
}) {
  return (
    <Card className={`animate-fade-in-${delay}`}>
      <CardContent className="p-4 md:p-5 flex items-center gap-3 md:gap-4">
        <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--badge-bg)]">
          <Icon className="h-5 w-5 md:h-6 md:w-6 text-[var(--muted)]" />
        </div>
        <div className="min-w-0">
          <p className="text-xs md:text-sm text-[var(--muted)] truncate">{label}</p>
          <p className="text-xl md:text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
