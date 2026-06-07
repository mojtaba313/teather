import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { AppLayout } from "@/src/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { Badge } from "@/src/components/ui/Badge"
import { Button } from "@/src/components/ui/Button"
import { revalidatePath } from "next/cache"
import { hasAnyRole } from "@/src/lib/roles"
import type { Character, Casting, User } from "@prisma/client"
import { Clapperboard, UserCheck, UserX, ArrowLeft } from "lucide-react"
import Link from "next/link"

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

  const assignedCount = characters.filter((c) => c.castings.length > 0).length

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
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">انتخاب بازیگر</h1>
              <p className="text-[var(--muted)] mt-1">
                {assignedCount} از {characters.length} شخصیت بازیگر دارند
              </p>
            </div>
          </div>
        </div>

        {characters.length === 0 ? (
          <Card className="animate-fade-in-1">
            <CardContent className="py-12 md:py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--badge-bg)]">
                  <Clapperboard className="h-7 w-7 text-[var(--muted)]" />
                </div>
                <p className="text-[var(--muted)]">ابتدا شخصیت‌ها را در بخش فیلمنامه ایجاد کنید</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 animate-fade-in-1">
            {characters.map((char: Character & { castings: (Casting & { actor: User })[] }, i) => {
              const casting = char.castings[0]
              return (
                <Card key={char.id} className={`animate-fade-in-${Math.min(i + 2, 8)}`}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {char.image ? (
                        <img src={char.image} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-[var(--card-border)]" />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--badge-bg)] text-sm font-medium text-[var(--muted)]">
                          {char.name.charAt(0)}
                        </div>
                      )}
                      <CardTitle>{char.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {char.description && (
                      <p className="text-sm text-[var(--muted)] mb-4">{char.description}</p>
                    )}
                    {casting ? (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--green-border)] bg-[var(--green-bg)] p-3">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-[var(--green-text)]" />
                          <div>
                            <p className="text-sm font-medium">{casting.actor.name}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">@{casting.actor.username}</p>
                          </div>
                        </div>
                        {canAssign && (
                          <form action={assignActor}>
                            <input type="hidden" name="projectId" value={id} />
                            <input type="hidden" name="characterId" value={char.id} />
                            <input type="hidden" name="actorUserId" value="" />
                            <Button type="submit" variant="ghost" size="sm" className="text-[var(--red-text)]">
                              <UserX className="h-4 w-4" />
                            </Button>
                          </form>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <UserX className="h-4 w-4 text-[var(--muted-foreground)]" />
                          <p className="text-sm text-[var(--muted-foreground)]">اختصاص داده نشده</p>
                        </div>
                        {canAssign && (
                          <form action={assignActor} className="flex flex-col sm:flex-row gap-2">
                            <input type="hidden" name="projectId" value={id} />
                            <input type="hidden" name="characterId" value={char.id} />
                            <select
                              name="actorUserId"
                              className="flex-1 rounded-xl border border-[var(--input-border)] bg-[var(--select-bg)] px-3 py-2 text-sm shadow-sm backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                            >
                              <option value="">انتخاب بازیگر...</option>
                              {projectMembers.map((pm) => (
                                <option key={pm.userId} value={pm.userId}>
                                  {pm.user.name}
                                </option>
                              ))}
                            </select>
                            <Button type="submit" size="sm">تایید</Button>
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
