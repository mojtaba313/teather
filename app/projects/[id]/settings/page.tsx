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
  const projectId = formData.get("projectId") as string

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
  })
  if (!member || !member.roles.includes("director")) return

  const name = formData.get("name") as string
  const username = formData.get("username") as string
  const password = formData.get("password") as string
  if (!name || !username || !password) {
    redirect(`/projects/${projectId}/settings?error=validation`)
  }

  const exists = await prisma.user.findUnique({ where: { username } })
  if (exists) {
    redirect(`/projects/${projectId}/settings?error=exists`)
  }

  const bcrypt = await import("bcryptjs")
  const hashed = await bcrypt.hash(password, 12)

  const roles = formData.getAll("roles") as string[]
  const user = await prisma.user.create({
    data: { name, username, password: hashed },
  })

  const assignRoles = roles.length > 0 ? roles : ["viewer"]
  await prisma.projectMember.create({
    data: { userId: user.id, projectId, roles: assignRoles },
  })

  revalidatePath(`/projects/${projectId}/settings`)
  redirect(`/projects/${projectId}/settings?success=created`)
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
  if (!member || !member.roles.includes("director")) {
    redirect(`/projects/${projectId}/settings?error=forbidden`)
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    redirect(`/projects/${projectId}/settings?error=notfound`)
  }

  const existing = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: user.id, projectId } },
  })
  if (existing) {
    redirect(`/projects/${projectId}/settings?error=already_member`)
  }

  await prisma.projectMember.create({
    data: { userId: user.id, projectId, roles: roles.length > 0 ? roles : ["viewer"] },
  })
  revalidatePath(`/projects/${projectId}/settings`)
  redirect(`/projects/${projectId}/settings?success=added`)
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

export default async function SettingsPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const { id } = await props.params
  const { success, error } = await props.searchParams

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

  const memberIds = project.members.map((m) => m.userId)
  const otherUsers = await prisma.user.findMany({
    where: { id: { notIn: memberIds } },
    orderBy: { name: "asc" },
    take: 50,
  })

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-8">
        <h1 className="text-2xl font-bold">تنظیمات پروژه</h1>

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success === "created" && "کاربر ساخته شد و به پروژه اضافه گردید."}
            {success === "added" && "عضو جدید با موفقیت اضافه شد."}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error === "exists" && "این نام کاربری قبلاً ثبت شده است."}
            {error === "notfound" && "کاربری با این نام کاربری یافت نشد."}
            {error === "already_member" && "این کاربر قبلاً عضو پروژه است."}
            {error === "validation" && "لطفاً همه فیلدها را پر کنید."}
            {error === "forbidden" && "شما مجوز این کار را ندارید."}
          </div>
        )}

        <Card>
          <CardHeader><CardTitle>وضعیت پروژه</CardTitle></CardHeader>
          <CardContent>
            <form action={saveStatus} className="flex gap-3 items-end">
              <input type="hidden" name="projectId" value={id} />
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5">وضعیت</label>
                <select name="status" defaultValue={project.status} className="w-full rounded-xl border border-neutral-200 bg-white/50 px-3 py-2 text-sm shadow-sm backdrop-blur-sm" disabled={!canManage}>
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
          <Card>
            <CardHeader>
              <CardTitle>کاربر جدید</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createUser} className="space-y-3">
                <input type="hidden" name="projectId" value={id} />
                <div>
                  <label className="block text-sm font-medium mb-1.5">نام و نام خانوادگی</label>
                  <Input name="name" required placeholder="مثلاً: علی رضایی" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">نام کاربری</label>
                  <Input name="username" required placeholder="مثلاً: ali_rezayi" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">رمز عبور</label>
                  <Input name="password" type="password" required minLength={6} placeholder="حداقل ۶ کاراکتر" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">نقش‌ها در پروژه</label>
                  <div className="flex flex-wrap gap-3">
                    {allRoles.map((role) => (
                      <label key={role} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" name="roles" value={role} defaultChecked={role === "viewer"} className="rounded border-neutral-300" />
                        {roleLabels[role]}
                      </label>
                    ))}
                  </div>
                </div>
                <Button type="submit" size="sm">ایجاد کاربر و افزودن به پروژه</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {member.roles.includes("director") && otherUsers.length > 0 && (
          <Card>
            <CardHeader><CardTitle>افزودن کاربران موجود</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {otherUsers.map((u) => (
                <form key={u.id} action={addMember} className="flex items-center justify-between rounded-lg border border-neutral-100 bg-white/40 p-3 transition-colors hover:bg-white/80">
                  <input type="hidden" name="projectId" value={id} />
                  <input type="hidden" name="username" value={u.username} />
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-neutral-500">@{u.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-wrap gap-1">
                      {allRoles.map((role) => (
                        <label key={role} className="flex items-center gap-1 text-xs">
                          <input type="checkbox" name="roles" value={role} defaultChecked={role === "viewer"} className="rounded border-neutral-300" />
                          <span className="text-neutral-600">{roleLabels[role]}</span>
                        </label>
                      ))}
                    </div>
                    <Button type="submit" size="sm" variant="secondary">افزودن</Button>
                  </div>
                </form>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>اعضای پروژه ({project.members.length} نفر)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {project.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-neutral-100 bg-white/40 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-600">
                    {m.user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.user.name}</p>
                    <p className="text-xs text-neutral-500">@{m.user.username}</p>
                  </div>
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
                      <Button type="submit" variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                        حذف
                      </Button>
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
