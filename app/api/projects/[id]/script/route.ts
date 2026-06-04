import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { hasAnyRole } from "@/src/lib/roles"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId: id } },
  })
  if (!member || !hasAnyRole(member.roles, ["writer", "director"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { contentJson } = await req.json()
  const script = await prisma.script.upsert({
    where: { projectId: id },
    update: { contentJson },
    create: { projectId: id, contentJson },
  })
  revalidatePath(`/projects/${id}/script`)
  return NextResponse.json(script)
}
