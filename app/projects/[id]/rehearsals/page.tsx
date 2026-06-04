import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { AppLayout } from "@/src/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { Badge } from "@/src/components/ui/Badge"
import { Plus } from "lucide-react"
import { revalidatePath } from "next/cache"
import { hasAnyRole } from "@/src/lib/roles"
import { RehearsalForm } from "./rehearsal-form"

const rehearsalStatus: Record<string, string> = {
  SCHEDULED: "برنامه‌ریزی شده",
  COMPLETED: "انجام شده",
  CANCELLED: "لغو شده",
}

async function createRehearsal(formData: FormData) {
  "use server"
  const session = await auth()
  if (!session?.user?.id) return
  const projectId = formData.get("projectId") as string
  const title = formData.get("title") as string
  const dateTime = formData.get("dateTime") as string
  const durationMinutes = parseInt(formData.get("durationMinutes") as string) || 60

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
  })
  if (!member || !hasAnyRole(member.roles, ["director", "stage_manager"])) return

  await prisma.rehearsal.create({
    data: { projectId, title, dateTime: new Date(dateTime), durationMinutes },
  })
  revalidatePath(`/projects/${projectId}/rehearsals`)
}

export default async function RehearsalsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const { id } = await params

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId: id } },
  })
  if (!member) notFound()

  const canManage = hasAnyRole(member.roles, ["director", "stage_manager"])
  const isActor = member.roles.includes("actor")

  const rehearsals = await prisma.rehearsal.findMany({
    where: { projectId: id },
    include: {
      attendances: isActor ? { where: { userId: session.user.id } } : true,
      _count: { select: { attendances: true } },
    },
    orderBy: { dateTime: "desc" },
  })

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">تمرینات</h1>
          {canManage && <RehearsalForm projectId={id} />}
        </div>

        {rehearsals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-neutral-500">هیچ تمرینی برنامه‌ریزی نشده است</CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rehearsals.map((r) => {
              const attended = r.attendances.length > 0 && "status" in r.attendances[0]
                ? (r.attendances[0] as any).status
                : null
              return (
                <Card key={r.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{r.title}</CardTitle>
                      <Badge>{rehearsalStatus[r.status] || r.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-neutral-500">
                      <span>{new Date(r.dateTime).toLocaleDateString("fa-IR")}</span>
                      <span>{new Date(r.dateTime).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span>{r.durationMinutes} دقیقه</span>
                    </div>
                    {attended && (
                      <p className="text-sm mt-2">
                        وضعیت حضور: {attended === "PRESENT" ? "حاضر" : attended === "ABSENT" ? "غایب" : "موجه"}
                      </p>
                    )}
                    {canManage && (
                      <p className="text-xs text-neutral-400 mt-2">{r._count.attendances} حضور ثبت شده</p>
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
