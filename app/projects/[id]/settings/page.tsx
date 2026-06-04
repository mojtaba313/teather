import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { AppLayout } from "@/src/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { Badge } from "@/src/components/ui/Badge"
import { hasAnyRole } from "@/src/lib/roles"
import { revalidatePath } from "next/cache"

const roleLabels: Record<string, string> = {
  writer: "نویسنده",
  director: "کارگردان",
  actor: "بازیگر",
  stage_manager: "مدیر صحنه",
  viewer: "بیننده",
}

const allRoles = ["writer", "director", "actor", "stage_manager", "viewer"]

async function createUser(formData: FormData) {
  "use server"
  const session = await auth()
  if (!session?.user?.id) return
  const isDirector = await prisma.projectMember.findFirst({
    where: { userId: session.user.id, roles: { has: "director" } },
  })
  if (!isDirector) return

  const name = formData.get("name") as string
  const username = formData.get("username") as string
  const password = formData.get("password") as string
  if (!name || !username || !password) return

  const exists = await prisma.user.findUnique({ where: { username } })
  if (exists) return

  const bcrypt = await import("bcryptjs")
  const hashed = await bcrypt.hash(password, 12)
  await prisma.user.create({ data: { name, username, password: hashed } })
  revalidatePath(`/projects/${formData.get("projectId")}/settings`)
}

async function addMember(formData: FormData) {
  "use server"
  const session = await auth()
  if (!session?.user?.id) return
  const projectId = formData.get("projectId") as string
  const username = formData.get("username") as string
  const roles = formData.getAll("roles") as string[]

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
  })
  if (!member || !member.roles.includes("director")) return

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) return

  const existing = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: user.id, projectId } },
  })
  if (existing) return

  await prisma.projectMember.create({
    data: { userId: user.id, projectId, roles },
  })
  revalidatePath(`/projects/${projectId}/settings`)
}

async function saveStatus(formData: FormData) {
  "use server"
  const session = await auth()
  if (!session?.user?.id) return
  const projectId = formData.get("projectId") as string
  const status = formData.get("status") as string

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
  })
  if (!member || !hasAnyRole(member.roles, ["director", "stage_manager"])) return

  await prisma.project.update({ where: { id: projectId }, data: { status: status as any } })
  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/settings`)
}

async function removeMember(formData: FormData) {
  "use server"
  const session = await auth()
  if (!session?.user?.id) return
  const projectId = formData.get("projectId") as string
  const memberId = formData.get("memberId") as string

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
  })
  if (!member || !hasAnyRole(member.roles, ["director"])) return

  await prisma.projectMember.delete({ where: { id: memberId } })
  revalidatePath(`/projects/${projectId}/settings`)
}

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const { id } = await params

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId: id } },
  })
  if (!member) notFound()

  const canManage = hasAnyRole(member.roles, ["director", "stage_manager"])

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      members: { include: { user: true } },
    },
  })
  if (!project) notFound()

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">تنظیمات پروژه</h1>

        <Card>
          <CardHeader><CardTitle>وضعیت پروژه</CardTitle></CardHeader>
          <CardContent>
            <form action={saveStatus} className="flex gap-3 items-end">
              <input type="hidden" name="projectId" value={id} />
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5">وضعیت</label>
                <select name="status" defaultValue={project.status} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm" disabled={!canManage}>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              {canManage && <Button type="submit" size="sm">ذخیره</Button>}
            </form>
          </CardContent>
        </Card>

        {member.roles.includes("director") && (
          <>
            <Card>
              <CardHeader><CardTitle>کاربر جدید</CardTitle></CardHeader>
              <CardContent>
                <form action={createUser} className="space-y-3">
                  <input type="hidden" name="projectId" value={id} />
                  <div>
                    <label className="block text-sm font-medium mb-1.5">نام</label>
                    <Input name="name" required placeholder="نام و نام خانوادگی" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">نام کاربری</label>
                    <Input name="username" required placeholder="نام کاربری" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">رمز عبور</label>
                    <Input name="password" type="password" required minLength={6} />
                  </div>
                  <Button type="submit" size="sm">ایجاد کاربر</Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>افزودن عضو به پروژه</CardTitle></CardHeader>
              <CardContent>
                <form action={addMember} className="space-y-3">
                  <input type="hidden" name="projectId" value={id} />
                  <div>
                    <label className="block text-sm font-medium mb-1.5">نام کاربری</label>
                    <Input name="username" required placeholder="نام کاربری عضو" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">نقش‌ها</label>
                    <div className="flex flex-wrap gap-3">
                      {allRoles.map((role) => (
                        <label key={role} className="flex items-center gap-1.5 text-sm">
                          <input type="checkbox" name="roles" value={role} defaultChecked={role === "viewer"} />
                          {roleLabels[role]}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" size="sm">افزودن عضو</Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader><CardTitle>اعضای پروژه</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {project.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div>
                  <p className="font-medium">{m.user.name}</p>
                  <p className="text-sm text-neutral-500">@{m.user.username}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap gap-1">
                    {m.roles.map((role) => (
                      <Badge key={role}>{roleLabels[role] || role}</Badge>
                    ))}
                  </div>
                  {member.roles.includes("director") && m.id !== member.id && (
                    <form action={removeMember}>
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="memberId" value={m.id} />
                      <Button type="submit" variant="destructive" size="sm">حذف</Button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

const statusLabels: Record<string, string> = {
  IDEA: "ایده",
  PRE_PRODUCTION: "پیش‌تولید",
  REHEARSAL: "تمرین",
  PERFORMANCE: "اجرا",
  ARCHIVED: "بایگانی",
}
