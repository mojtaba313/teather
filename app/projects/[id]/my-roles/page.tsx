import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { AppLayout } from "@/src/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { BookOpen, ArrowLeft, Mic } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/src/components/ui/Badge"

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
        <div className="space-y-6 animate-fade-in">
          <Link
            href={`/projects/${id}`}
            className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            بازگشت به پروژه
          </Link>
          <Card>
            <CardContent className="py-12 md:py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--badge-bg)]">
                  <BookOpen className="h-7 w-7 text-[var(--muted)]" />
                </div>
                <p className="text-[var(--muted)]">هنوز نقشی به شما اختصاص داده نشده است</p>
              </div>
            </CardContent>
          </Card>
        </div>
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
      <div className="space-y-6 md:space-y-8">
        <div className="animate-fade-in">
          <Link
            href={`/projects/${id}`}
            className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            بازگشت به پروژه
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            نقش‌های من در {project.title}
          </h1>
        </div>

        <Card className="animate-fade-in-1">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--badge-bg)]">
                <Mic className="h-5 w-5 text-[var(--muted)]" />
              </div>
              <div>
                <CardTitle className="text-lg">{myCasting.character.name}</CardTitle>
                {myCasting.character.description && (
                  <p className="text-sm text-[var(--muted)] mt-1">{myCasting.character.description}</p>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="animate-fade-in-2">
          <h2 className="text-lg font-semibold mb-4">دیالوگ‌های من</h2>
          {myDialogues.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-[var(--muted)]">
                هنوز دیالوگی برای این شخصیت ثبت نشده است
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myDialogues.map((d) => (
                <Card key={d.id} className="group hover-lift">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--badge-bg)] text-xs font-mono text-[var(--muted)]">
                          {d.lineOrder + 1}
                        </span>
                        {d.scene.title}
                      </CardTitle>
                      <Badge variant="outline">خط {d.lineOrder + 1}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{d.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
