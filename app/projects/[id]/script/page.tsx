import { getAuth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { notFound, redirect } from "next/navigation"
import dynamic from "next/dynamic"
import { AppLayout } from "@/src/components/AppLayout"
import { hasAnyRole } from "@/src/lib/roles"

const ScriptEditor = dynamic(() => import("./script-editor").then((m) => m.ScriptEditor), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--muted)] border-t-transparent" />
        <p className="text-sm text-[var(--muted-foreground)]">در حال بارگذاری ویرایشگر...</p>
      </div>
    </div>
  ),
})

export default async function ScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAuth()
  if (!session?.user?.id) redirect("/login")
  const { id } = await params

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId: id } },
  })
  if (!member) notFound()

  const canEdit = hasAnyRole(member.roles, ["writer", "director"])

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      script: true,
      characters: { orderBy: { name: "asc" } },
    },
  })
  if (!project) notFound()

  return (
    <AppLayout>
      <ScriptEditor
        projectId={id}
        script={project.script}
        characters={project.characters}
        canEdit={canEdit}
      />
    </AppLayout>
  )
}
