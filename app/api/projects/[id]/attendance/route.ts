import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const projectId = (await params).id
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
  })
  if (!member || !member.roles.includes("actor"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const body = await req.json()
  const attendance = await prisma.attendance.upsert({
    where: { rehearsalId_userId: { rehearsalId: body.rehearsalId, userId: session.user.id } },
    update: { status: body.status },
    create: { rehearsalId: body.rehearsalId, userId: session.user.id, status: body.status },
  })
  revalidatePath(`/projects/${projectId}/rehearsals`)
  return NextResponse.json(attendance)
}
