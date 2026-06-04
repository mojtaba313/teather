import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { AppLayout } from "@/src/components/AppLayout"
import { ScriptEditor } from "./script-editor"
import { hasAnyRole } from "@/src/lib/roles"

export default async function ScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
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
