import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { AppLayout } from "@/src/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { revalidatePath } from "next/cache"
import { hasAnyRole } from "@/src/lib/roles"
import type { Character, Casting, User } from "@prisma/client"

async function assignActor(formData: FormData) {
  "use server"
  const session = await auth()
  if (!session?.user?.id) return
  const projectId = formData.get("projectId") as string
  const characterId = formData.get("characterId") as string
  const actorUserId = formData.get("actorUserId") as string

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
  })
  if (!member || !hasAnyRole(member.roles, ["director", "stage_manager"])) return

  if (actorUserId) {
    await prisma.casting.upsert({
      where: { characterId },
      update: { actorUserId },
      create: { projectId, characterId, actorUserId },
    })
  } else {
    await prisma.casting.deleteMany({ where: { characterId } })
  }
  revalidatePath(`/projects/${projectId}/casting`)
}

export default async function CastingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const { id } = await params

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId: id } },
  })
  if (!member) notFound()

  const canAssign = hasAnyRole(member.roles, ["director", "stage_manager"])

  const characters = await prisma.character.findMany({
    where: { projectId: id },
    include: { castings: { include: { actor: true } } },
    orderBy: { name: "asc" },
  })

  const projectMembers = await prisma.projectMember.findMany({
    where: { projectId: id, roles: { has: "actor" } },
    include: { user: true },
  })

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">انتخاب بازیگر</h1>

        {characters.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-neutral-500">
              ابتدا شخصیت‌ها را در بخش فیلمنامه ایجاد کنید
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {characters.map((char: Character & { castings: (Casting & { actor: User })[] }) => {
              const casting = char.castings[0]
              return (
                <Card key={char.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {char.image && (
                        <img src={char.image} alt="" className="h-10 w-10 rounded-full object-cover" />
                      )}
                      <CardTitle>{char.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {char.description && <p className="text-sm text-neutral-500 mb-3">{char.description}</p>}
                    {casting ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{casting.actor.name}</p>
                          <p className="text-xs text-neutral-500">@{casting.actor.username}</p>
                        </div>
                        {canAssign && (
                          <form action={assignActor}>
                            <input type="hidden" name="projectId" value={id} />
                            <input type="hidden" name="characterId" value={char.id} />
                            <input type="hidden" name="actorUserId" value="" />
                            <button type="submit" className="text-sm text-red-600 hover:underline">لغو</button>
                          </form>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-neutral-400 mb-3">اختصاص داده نشده</p>
                        {canAssign && (
                          <form action={assignActor} className="flex gap-2">
                            <input type="hidden" name="projectId" value={id} />
                            <input type="hidden" name="characterId" value={char.id} />
                            <select
                              name="actorUserId"
                              className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                            >
                              <option value="">انتخاب بازیگر...</option>
                              {projectMembers.map((pm) => (
                                <option key={pm.userId} value={pm.userId}>
                                  {pm.user.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white"
                            >
                              تایید
                            </button>
                          </form>
                        )}
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
