import { getAuth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { AppLayout } from "@/src/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { Badge } from "@/src/components/ui/Badge"
import { hasAnyRole } from "@/src/lib/roles"
import { Calendar, ArrowLeft, Clock, Users } from "lucide-react"
import Link from "next/link"
import { RehearsalForm } from "./rehearsal-form"

const rehearsalStatus: Record<string, string> = {
  SCHEDULED: "برنامه‌ریزی شده",
  COMPLETED: "انجام شده",
  CANCELLED: "لغو شده",
}

const statusVariants: Record<string, "default" | "outline" | "success" | "warning" | "destructive"> = {
  SCHEDULED: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
}

export default async function RehearsalsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAuth()
  if (!session?.user?.id) redirect("/login")
  const { id } = await params

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId: id } },
  })
  if (!member) notFound()

  const canManage = hasAnyRole(member.roles, ["director", "stage_manager"])

  const rehearsals = await prisma.rehearsal.findMany({
    where: { projectId: id },
    include: {
      attendances: member.roles.includes("actor") ? { where: { userId: session.user.id } } : true,
      _count: { select: { attendances: true } },
    },
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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">تمرینات</h1>
            {canManage && <RehearsalForm projectId={id} />}
          </div>
        </div>

        {rehearsals.length === 0 ? (
          <Card className="animate-fade-in-1">
            <CardContent className="py-12 md:py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--badge-bg)]">
                  <Calendar className="h-7 w-7 text-[var(--muted)]" />
                </div>
                <p className="text-[var(--muted)]">هیچ تمرینی برنامه‌ریزی نشده است</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 animate-fade-in-1">
            {rehearsals.map((r, i) => {
              const attendedStatus = r.attendances.length > 0 && "status" in r.attendances[0]
                ? (r.attendances[0] as { status: string }).status
                : null

              return (
                <Card key={r.id} className={`hover-lift animate-fade-in-${Math.min(i + 2, 8)}`}>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <CardTitle className="text-base">{r.title}</CardTitle>
                      <Badge variant={statusVariants[r.status] || "default"}>
                        {rehearsalStatus[r.status] || r.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(r.dateTime).toLocaleDateString("fa-IR")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(r.dateTime).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {r.durationMinutes} دقیقه
                      </span>
                    </div>
                    {attendedStatus && (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs">
                        وضعیت حضور:{" "}
                        <span className={
                          attendedStatus === "PRESENT"
                            ? "text-[var(--green-text)]"
                            : attendedStatus === "ABSENT"
                            ? "text-[var(--red-text)]"
                            : "text-[var(--amber-text)]"
                        }>
                          {attendedStatus === "PRESENT"
                            ? "حاضر"
                            : attendedStatus === "ABSENT"
                            ? "غایب"
                            : "موجه"}
                        </span>
                      </div>
                    )}
                    {canManage && (
                      <div className="mt-3 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                        <Users className="h-3.5 w-3.5" />
                        {r._count.attendances} حضور ثبت شده
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
