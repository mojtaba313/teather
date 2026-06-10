import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { AppLayout } from "@/src/components/AppLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { BookOpen, ArrowLeft, Mic } from "lucide-react"
import Link from "next/link"
import { ScriptViewer } from "./script-viewer"

export type ScriptContentItem =
  | { type: "dialogue"; characterId: string; characterName: string; text: string; lineOrder: number }
  | { type: "description"; text: string }

export type ScriptScene = {
  orderIndex: number
  title: string
  setting: string
  timeOfDay: string
  summary: string
  content: ScriptContentItem[]
}

export type NoteMap = Record<string, { memorized: boolean; notes: string | null }>

export default async function MyRolesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const { id } = await params

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId: id } },
  })
  if (!member) notFound()

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      script: true,
      castings: {
        where: { actorUserId: session.user.id },
        include: { character: true },
      },
    },
  })
  if (!project) notFound()

  const myCastings = project.castings
  const myCharacterIds = myCastings.map((c) => c.characterId)

  const rawJson = project.script?.contentJson as { scenes?: Record<string, unknown>[] } | null
  const scenes: ScriptScene[] = rawJson?.scenes
    ? rawJson.scenes.map((s) => ({
        orderIndex: (s.orderIndex as number) ?? 0,
        title: (s.title as string) ?? "",
        setting: (s.setting as string) ?? "",
        timeOfDay: (s.timeOfDay as string) ?? "",
        summary: (s.summary as string) ?? "",
        content: ((s.content as ScriptContentItem[]) || []).map((item) => {
          if (item.type === "dialogue") {
            return {
              type: "dialogue" as const,
              characterId: item.characterId ?? "",
              characterName: item.characterName ?? "",
              text: item.text ?? "",
              lineOrder: item.lineOrder ?? 0,
            }
          }
          return { type: "description" as const, text: item.text ?? "" }
        }),
      }))
    : []

  // Build keys for all dialogues and fetch notes
  const allDialogueKeys = scenes.flatMap((s) =>
    s.content
      .filter((c) => c.type === "dialogue")
      .map((c) => `${s.orderIndex}-${(c as Extract<ScriptContentItem, { type: "dialogue" }>).lineOrder}-${(c as Extract<ScriptContentItem, { type: "dialogue" }>).characterId}`)
  )

  const noteRecords = await prisma.dialogueNote.findMany({
    where: { userId: session.user.id, key: { in: allDialogueKeys } },
  })

  const noteMap: NoteMap = {}
  for (const record of noteRecords) {
    noteMap[record.key] = { memorized: record.memorized, notes: record.notes }
  }

  const totalDialogues = scenes.reduce(
    (acc, s) => acc + s.content.filter((c) => c.type === "dialogue").length,
    0
  )

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

        {myCastings.length === 0 ? (
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
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in-1">
              {myCastings.map((casting) => (
                <Card key={casting.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--badge-bg)]">
                        <Mic className="h-5 w-5 text-[var(--accent)]" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{casting.character.name}</CardTitle>
                        {casting.character.description && (
                          <p className="text-sm text-[var(--muted)] mt-1">{casting.character.description}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>

            {scenes.length === 0 ? (
              <Card className="animate-fade-in-2">
                <CardContent className="py-12 text-center text-[var(--muted)]">
                  هنوز فیلمنامه‌ای برای این پروژه نوشته نشده است
                </CardContent>
              </Card>
            ) : (
              <div className="animate-fade-in-2">
                <ScriptViewer
                  scenes={scenes}
                  myCharacterIds={myCharacterIds}
                  projectId={id}
                  noteMap={noteMap}
                  totalDialogues={totalDialogues}
                />
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
