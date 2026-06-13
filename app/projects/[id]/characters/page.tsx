import { auth, getAuth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/src/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { Plus, Pencil, Trash2, X, Users, ArrowLeft } from "lucide-react"
import { hasAnyRole } from "@/src/lib/roles"
import { revalidatePath } from "next/cache"
import { writeFile } from "fs/promises"
import path from "path"
import crypto from "crypto"

async function deleteCharacter(formData: FormData) {
  "use server"
  const session = await auth()
  if (!session?.user?.id) return
  const characterId = formData.get("characterId") as string
  const projectId = formData.get("projectId") as string

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
  })
  if (!member || !hasAnyRole(member.roles, ["writer", "director"])) return

  await prisma.character.delete({ where: { id: characterId } })
  revalidatePath(`/projects/${projectId}/characters`)
}

async function editCharacter(formData: FormData) {
  "use server"
  const session = await auth()
  if (!session?.user?.id) return
  const characterId = formData.get("characterId") as string
  const projectId = formData.get("projectId") as string

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
  })
  if (!member || !hasAnyRole(member.roles, ["writer", "director"])) return

  const name = formData.get("name") as string
  if (!name) return

  let image = formData.get("existingImage") as string || null
  const file = formData.get("image") as File | null
  if (file && file.size > 0) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${crypto.randomUUID()}.${ext}`
    const filepath = path.join(process.cwd(), "public", "uploads", filename)
    await writeFile(filepath, buffer)
    image = `/uploads/${filename}`
  }

  await prisma.character.update({
    where: { id: characterId },
    data: {
      name,
      description: (formData.get("description") as string) || null,
      age: formData.get("age") ? Number(formData.get("age")) : null,
      gender: (formData.get("gender") as string) || null,
      image,
    },
  })
  revalidatePath(`/projects/${projectId}/characters`)
  revalidatePath(`/projects/${projectId}/script`)
}

export default async function CharactersPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  const session = await getAuth()
  if (!session?.user?.id) redirect("/login")
  const { id } = await props.params
  const { edit: editingId } = await props.searchParams

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId: id } },
  })
  if (!member) notFound()

  const canEdit = hasAnyRole(member.roles, ["writer", "director"])

  const characters = await prisma.character.findMany({
    where: { projectId: id },
    orderBy: { name: "asc" },
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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">شخصیت‌ها</h1>
            {canEdit && (
              <Link href={`/projects/${id}/characters/new`}>
                <Button className="w-full sm:w-auto gap-2"><Plus className="h-4 w-4" />شخصیت جدید</Button>
              </Link>
            )}
          </div>
        </div>

        {characters.length === 0 ? (
          <Card className="animate-fade-in-1">
            <CardContent className="py-12 md:py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--badge-bg)]">
                  <Users className="h-7 w-7 text-[var(--muted)]" />
                </div>
                <p className="text-[var(--muted)]">هنوز شخصیتی تعریف نشده است</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in-1">
            {characters.map((char, i) => {
              const isEditing = editingId === char.id

              if (isEditing) {
                return (
                  <Card key={char.id} className={`animate-fade-in-${Math.min(i + 2, 8)}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>ویرایش شخصیت</CardTitle>
                        <Link href={`/projects/${id}/characters`}>
                          <Button variant="ghost" size="sm">
                            <X className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <form action={editCharacter} className="space-y-3">
                        <input type="hidden" name="characterId" value={char.id} />
                        <input type="hidden" name="projectId" value={id} />
                        <input type="hidden" name="existingImage" value={char.image ?? ""} />
                        <div>
                          <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">نام شخصیت</label>
                          <Input name="name" required defaultValue={char.name} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">توضیحات</label>
                          <textarea
                            name="description"
                            rows={3}
                            defaultValue={char.description ?? ""}
                            className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm shadow-sm backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-[var(--input-focus-border)]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">سن</label>
                            <Input name="age" type="number" defaultValue={char.age ?? ""} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">جنسیت</label>
                            <select
                              name="gender"
                              defaultValue={char.gender ?? ""}
                              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--select-bg)] px-3 py-2 text-sm shadow-sm backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                            >
                              <option value="">انتخاب...</option>
                              <option value="مرد">مرد</option>
                              <option value="زن">زن</option>
                              <option value="غیره">غیره</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">تصویر</label>
                          {char.image && (
                            <div className="mb-2">
                              <img src={char.image} alt="" className="h-20 w-20 rounded-xl object-cover ring-2 ring-[var(--card-border)]" />
                            </div>
                          )}
                          <input
                            name="image"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="w-full text-sm text-[var(--muted)] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--badge-bg)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--foreground)] hover:file:bg-[var(--card-bg)] transition-all"
                          />
                        </div>
                        <Button type="submit" size="sm">ذخیره تغییرات</Button>
                      </form>
                    </CardContent>
                  </Card>
                )
              }

              return (
                <Card key={char.id} className={`animate-fade-in-${Math.min(i + 2, 8)}`}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {char.image ? (
                        <img src={char.image} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-[var(--card-border)]" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--badge-bg)] text-base font-medium text-[var(--muted)]">
                          {char.name.charAt(0)}
                        </div>
                      )}
                      <CardTitle className="text-lg">{char.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {char.description && (
                      <p className="text-sm text-[var(--muted)] mb-3">{char.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
                      {char.age && (
                        <span className="rounded-lg bg-[var(--badge-bg)] px-2 py-1">{char.age} سال</span>
                      )}
                      {char.gender && (
                        <span className="rounded-lg bg-[var(--badge-bg)] px-2 py-1">{char.gender}</span>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--card-border)]">
                        <Link href={`/projects/${id}/characters?edit=${char.id}`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <form action={deleteCharacter}>
                          <input type="hidden" name="characterId" value={char.id} />
                          <input type="hidden" name="projectId" value={id} />
                          <Button type="submit" variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-[var(--red-text)]" />
                          </Button>
                        </form>
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
