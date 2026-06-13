import { auth, getAuth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { AppLayout } from "@/src/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { Plus, CalendarCheck, MapPin, Ticket, ArrowLeft } from "lucide-react"
import { revalidatePath } from "next/cache"
import { hasAnyRole } from "@/src/lib/roles"
import Link from "next/link"

async function createPerformance(formData: FormData) {
  "use server"
  const session = await auth()
  if (!session?.user?.id) return
  const projectId = formData.get("projectId") as string
  const dateTime = formData.get("dateTime") as string
  const venue = formData.get("venue") as string
  const ticketInfo = formData.get("ticketInfo") as string

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
  })
  if (!member || !hasAnyRole(member.roles, ["director", "stage_manager"])) return

  await prisma.performance.create({
    data: { projectId, dateTime: new Date(dateTime), venue, ticketInfo },
  })
  revalidatePath(`/projects/${projectId}/performances`)
}

export default async function PerformancesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAuth()
  if (!session?.user?.id) redirect("/login")
  const { id } = await params

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId: id } },
  })
  if (!member) notFound()

  const canManage = hasAnyRole(member.roles, ["director", "stage_manager"])

  const performances = await prisma.performance.findMany({
    where: { projectId: id },
    orderBy: { dateTime: "desc" },
  })

  return (
    <AppLayout>
      <div className="space-y-6 md:space-y-8">
        <div className="animate-fade-in">
          <Link
            href={`/projects/${id}`}
            className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            بازگشت به پروژه
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">اجراها</h1>
          </div>
        </div>

        {canManage && (
          <Card className="animate-fade-in-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-[var(--muted)]" />
                <CardTitle>اجرای جدید</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form action={createPerformance} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <input type="hidden" name="projectId" value={id} />
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">تاریخ</label>
                  <Input type="datetime-local" name="dateTime" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">مکان</label>
                  <Input type="text" name="venue" required placeholder="مکان اجرا" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">اطلاعات بلیط</label>
                  <Input type="text" name="ticketInfo" placeholder="قیمت / لینک فروش" />
                </div>
                <div className="flex items-end">
                  <Button type="submit" size="sm" className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    اجرای جدید
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {performances.length === 0 ? (
          <Card className="animate-fade-in-2">
            <CardContent className="py-12 md:py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--badge-bg)]">
                  <CalendarCheck className="h-7 w-7 text-[var(--muted)]" />
                </div>
                <p className="text-[var(--muted)]">هیچ اجرایی برنامه‌ریزی نشده است</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 animate-fade-in-2">
            {performances.map((p, i) => (
              <Card key={p.id} className={`hover-lift animate-fade-in-${Math.min(i + 3, 8)}`}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[var(--muted)]" />
                    <CardTitle className="text-base">{p.venue}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <CalendarCheck className="h-4 w-4" />
                    <span>{new Date(p.dateTime).toLocaleDateString("fa-IR")}</span>
                    <span>-</span>
                    <span>{new Date(p.dateTime).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {p.ticketInfo && (
                    <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                      <Ticket className="h-4 w-4" />
                      <span>{p.ticketInfo}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
