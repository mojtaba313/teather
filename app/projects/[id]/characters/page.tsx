import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/src/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { Plus, Pencil, Trash2, X } from "lucide-react"
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
  const session = await auth()
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">شخصیت‌ها</h1>
          {canEdit && (
            <Link href={`/projects/${id}/characters/new`}>
              <Button><Plus className="ml-2 h-4 w-4" />شخصیت جدید</Button>
            </Link>
          )}
        </div>

        {characters.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-neutral-500">
              هنوز شخصیتی تعریف نشده است
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {characters.map((char) => {
              const isEditing = editingId === char.id

              if (isEditing) {
                return (
                  <Card key={char.id}>
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
                          <label className="block text-sm font-medium mb-1.5">نام شخصیت</label>
                          <Input name="name" required defaultValue={char.name} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">توضیحات</label>
                          <textarea
                            name="description"
                            rows={3}
                            defaultValue={char.description ?? ""}
                            className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-1.5">سن</label>
                            <Input name="age" type="number" defaultValue={char.age ?? ""} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1.5">جنسیت</label>
                            <select
                              name="gender"
                              defaultValue={char.gender ?? ""}
                              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                            >
                              <option value="">انتخاب...</option>
                              <option value="مرد">مرد</option>
                              <option value="زن">زن</option>
                              <option value="غیره">غیره</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">تصویر</label>
                          {char.image && (
                            <div className="mb-2">
                              <img src={char.image} alt="" className="h-20 w-20 rounded-md object-cover" />
                            </div>
                          )}
                          <input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-neutral-100 file:px-3 file:py-1 file:text-sm file:font-medium" />
                        </div>
                        <Button type="submit" size="sm">ذخیره</Button>
                      </form>
                    </CardContent>
                  </Card>
                )
              }

              return (
                <Card key={char.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {char.image && (
                        <img src={char.image} alt="" className="h-12 w-12 rounded-full object-cover" />
                      )}
                      <CardTitle>{char.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {char.description && <p className="text-sm text-neutral-500 mb-2">{char.description}</p>}
                    <div className="flex gap-2 text-xs text-neutral-400">
                      {char.age && <span>{char.age} سال</span>}
                      {char.gender && <span>{char.gender}</span>}
                    </div>
                    {canEdit && (
                      <div className="flex gap-2 mt-3">
                        <Link href={`/projects/${id}/characters?edit=${char.id}`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <form action={deleteCharacter}>
                          <input type="hidden" name="characterId" value={char.id} />
                          <input type="hidden" name="projectId" value={id} />
                          <Button type="submit" variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-red-500" />
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
