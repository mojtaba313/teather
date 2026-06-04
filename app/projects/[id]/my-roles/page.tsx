import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { AppLayout } from "@/src/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"

export default async function MyRolesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const { id } = await params

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId: id } },
  })
  if (!member) notFound()

  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) notFound()

  const myCasting = await prisma.casting.findFirst({
    where: { projectId: id, actorUserId: session.user.id },
    include: { character: true },
  })

  if (!myCasting) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="py-12 text-center text-neutral-500">
            هنوز نقشی به شما اختصاص داده نشده است
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  const myDialogues = await prisma.dialogue.findMany({
    where: { characterId: myCasting.characterId },
    include: { scene: true },
    orderBy: { scene: { orderIndex: "asc" } },
  })

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">نقش‌های من در {project.title}</h1>

        <Card>
          <CardHeader>
            <CardTitle>{myCasting.character.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {myCasting.character.description && (
              <p className="text-sm text-neutral-500 mb-2">{myCasting.character.description}</p>
            )}
          </CardContent>
        </Card>

        <h2 className="text-lg font-semibold">دیالوگ‌های من</h2>
        {myDialogues.length === 0 ? (
          <p className="text-sm text-neutral-500">هنوز دیالوگی برای این شخصیت ثبت نشده است</p>
        ) : (
          <div className="space-y-4">
            {myDialogues.map((d) => (
              <Card key={d.id}>
                <CardHeader>
                  <CardTitle className="text-sm">{d.scene.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{d.text}</p>
                  <p className="text-xs text-neutral-400 mt-1">خط {d.lineOrder + 1}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
