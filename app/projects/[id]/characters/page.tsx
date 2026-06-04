import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/src/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { hasAnyRole } from "@/src/lib/roles"
import { revalidatePath } from "next/cache"

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

export default async function CharactersPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const { id } = await params

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
            {characters.map((char) => (
              <Card key={char.id}>
                <CardHeader>
                  <CardTitle>{char.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {char.description && <p className="text-sm text-neutral-500 mb-2">{char.description}</p>}
                  <div className="flex gap-2 text-xs text-neutral-400">
                    {char.age && <span>{char.age} سال</span>}
                    {char.gender && <span>{char.gender}</span>}
                  </div>
                  {canEdit && (
                    <form action={deleteCharacter} className="mt-3">
                      <input type="hidden" name="characterId" value={char.id} />
                      <input type="hidden" name="projectId" value={id} />
                      <Button type="submit" variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </form>
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
