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
import { Settings, UserPlus, Users, CheckCircle, XCircle, Shield, UserMinus, ArrowLeft, Pencil, AlertTriangle } from "lucide-react"
import Link from "next/link"
import type { ProjectStatus } from "@prisma/client"
import { updateProject } from "@/src/actions/projects"
import { DeleteProjectButton } from "./delete-project-button"

async function editProject(formData: FormData) {
  "use server"
  const projectId = formData.get("projectId") as string
  await updateProject(projectId, formData)
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

const allRoles = ["writer", "director", "actor", "stage_manager", "viewer"]

const statusLabels: Record<string, string> = {
  IDEA: "ایده",
  PRE_PRODUCTION: "پیش‌تولید",
  REHEARSAL: "تمرین",
  PERFORMANCE: "اجرا",
  ARCHIVED: "بایگانی",
}

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

  await prisma.project.update({ where: { id: projectId }, data: { status: status as ProjectStatus } })
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
      <div className="mx-auto max-w-2xl space-y-6 md:space-y-8">
        <div className="animate-fade-in">
          <Link
            href={`/projects/${id}`}
            className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            بازگشت به پروژه
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">تنظیمات پروژه</h1>
        </div>

        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-[var(--green-border)] bg-[var(--green-bg)] px-4 py-3 text-sm text-[var(--green-text)] animate-fade-in-down">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {success === "created" && "کاربر ساخته شد و به پروژه اضافه گردید."}
            {success === "added" && "عضو جدید با موفقیت اضافه شد."}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-[var(--red-border)] bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red-text)] animate-fade-in-down">
            <XCircle className="h-4 w-4 shrink-0" />
            {error === "exists" && "این نام کاربری قبلاً ثبت شده است."}
            {error === "notfound" && "کاربری با این نام کاربری یافت نشد."}
            {error === "already_member" && "این کاربر قبلاً عضو پروژه است."}
            {error === "validation" && "لطفاً همه فیلدها را پر کنید."}
            {error === "forbidden" && "شما مجوز این کار را ندارید."}
          </div>
        )}

        <div className="space-y-4 md:space-y-6 animate-fade-in-1">
          {/* Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-[var(--muted)]" />
                <CardTitle>وضعیت پروژه</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form action={saveStatus} className="flex flex-col sm:flex-row gap-3 items-end">
                <input type="hidden" name="projectId" value={id} />
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">وضعیت</label>
                  <select
                    name="status"
                    defaultValue={project.status}
                    disabled={!canManage}
                    className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--select-bg)] px-3 py-2 text-sm shadow-sm backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-[var(--input-focus-border)]"
                  >
                    {Object.entries(statusLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                {canManage && <Button type="submit" size="sm" className="w-full sm:w-auto">ذخیره</Button>}
              </form>
            </CardContent>
          </Card>

          {/* Edit project */}
          {canManage && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-[var(--muted)]" />
                  <CardTitle>ویرایش پروژه</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <form action={editProject} className="space-y-3">
                  <input type="hidden" name="projectId" value={id} />
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">عنوان پروژه</label>
                    <Input name="title" defaultValue={project.title} required placeholder="عنوان پروژه" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">توضیحات</label>
                    <textarea
                      name="description"
                      defaultValue={project.description ?? ""}
                      rows={3}
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm shadow-sm backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-[var(--input-focus-border)] resize-none"
                      placeholder="توضیحات پروژه..."
                    />
                  </div>
                  <Button type="submit" size="sm" className="gap-2">
                    <Pencil className="h-4 w-4" />
                    ذخیره تغییرات
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Danger zone */}
          {member.roles.includes("director") && (
            <Card className="border-[var(--red-border)]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--red-text)]" />
                  <CardTitle className="text-[var(--red-text)]">منطقه خطرناک</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--muted)] mb-4">
                  پس از حذف پروژه، تمامی اطلاعات مربوط به آن شامل فیلمنامه، شخصیت‌ها، تمرینات و اجراها برای همیشه حذف خواهند شد.
                </p>
                <DeleteProjectButton projectId={id} />
              </CardContent>
            </Card>
          )}

          {/* Create new user */}
          {member.roles.includes("director") && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-[var(--muted)]" />
                  <CardTitle>کاربر جدید</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <form action={createUser} className="space-y-3">
                  <input type="hidden" name="projectId" value={id} />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">نام و نام خانوادگی</label>
                      <Input name="name" required placeholder="مثلاً: علی رضایی" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">نام کاربری</label>
                      <Input name="username" required placeholder="مثلاً: ali_rezayi" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">رمز عبور</label>
                    <Input name="password" type="password" required minLength={6} placeholder="حداقل ۶ کاراکتر" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">نقش‌ها در پروژه</label>
                    <div className="flex flex-wrap gap-2">
                      {allRoles.map((role) => (
                        <label
                          key={role}
                          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm transition-all duration-200 hover:border-[var(--accent)] has-checked:border-[var(--accent)] has-checked:bg-[var(--badge-bg)]"
                        >
                          <input
                            type="checkbox"
                            name="roles"
                            value={role}
                            defaultChecked={role === "viewer"}
                            className="rounded border-[var(--input-border)] text-[var(--accent)] focus:ring-[var(--input-focus-ring)]"
                          />
                          {roleLabels[role]}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" size="sm" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    ایجاد کاربر و افزودن به پروژه
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Add existing users */}
          {member.roles.includes("director") && otherUsers.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[var(--muted)]" />
                  <CardTitle>افزودن کاربران موجود</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {otherUsers.map((u) => (
                  <form
                    key={u.id}
                    action={addMember}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 transition-all duration-200 hover:shadow-md"
                  >
                    <input type="hidden" name="projectId" value={id} />
                    <input type="hidden" name="username" value={u.username} />
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--badge-bg)] text-sm font-medium text-[var(--muted)]">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">@{u.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex flex-wrap gap-1">
                        {allRoles.map((role) => (
                          <label
                            key={role}
                            className="flex cursor-pointer items-center gap-1 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-xs transition-all hover:border-[var(--accent)] has-checked:border-[var(--accent)] has-checked:bg-[var(--badge-bg)]"
                          >
                            <input
                              type="checkbox"
                              name="roles"
                              value={role}
                              defaultChecked={role === "viewer"}
                              className="rounded border-[var(--input-border)] text-[var(--accent)]"
                            />
                            {roleLabels[role]}
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

          {/* Members list */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[var(--muted)]" />
                <CardTitle>اعضای پروژه ({project.members.length} نفر)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {project.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--badge-bg)] text-sm font-medium text-[var(--muted)]">
                      {m.user.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.user.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">@{m.user.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-wrap gap-1 justify-end">
                      {m.roles.map((role) => (
                        <Badge key={role} variant="default" className={roleColors[role]}>
                          {roleLabels[role] || role}
                        </Badge>
                      ))}
                    </div>
                    {member.roles.includes("director") && m.id !== member.id && (
                      <form action={removeMember}>
                        <input type="hidden" name="projectId" value={id} />
                        <input type="hidden" name="memberId" value={m.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-[var(--red-text)] hover:bg-[var(--red-bg)]"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
