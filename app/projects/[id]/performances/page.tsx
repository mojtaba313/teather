import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { AppLayout } from "@/src/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { Plus } from "lucide-react"
import { revalidatePath } from "next/cache"
import { hasAnyRole } from "@/src/lib/roles"

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
  const session = await auth()
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">اجراها</h1>
          {canManage && (
            <form action={createPerformance} className="flex gap-2 items-end">
              <input type="hidden" name="projectId" value={id} />
              <div>
                <label className="block text-xs mb-1">تاریخ</label>
                <input type="datetime-local" name="dateTime" required className="rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs mb-1">مکان</label>
                <input type="text" name="venue" required placeholder="مکان اجرا" className="rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white" />
              </div>
              <Button type="submit" size="sm"><Plus className="ml-2 h-4 w-4" />اجرای جدید</Button>
            </form>
          )}
        </div>

        {performances.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-neutral-500">هیچ اجرایی برنامه‌ریزی نشده است</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {performances.map((p) => (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle>{p.venue}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{new Date(p.dateTime).toLocaleDateString("fa-IR")} - {new Date(p.dateTime).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</p>
                  {p.ticketInfo && <p className="text-sm text-neutral-500 mt-1">{p.ticketInfo}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
