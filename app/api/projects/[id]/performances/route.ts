import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { hasAnyRole } from "@/src/lib/roles"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const projectId = (await params).id
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
  })
  if (!member || !hasAnyRole(member.roles, ["director", "stage_manager"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const body = await req.json()
  const performance = await prisma.performance.create({
    data: { projectId, dateTime: new Date(body.dateTime), venue: body.venue, ticketInfo: body.ticketInfo },
  })
  revalidatePath(`/projects/${projectId}/performances`)
  return NextResponse.json(performance)
}
