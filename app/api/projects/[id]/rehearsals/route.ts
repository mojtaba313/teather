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
  const rehearsal = await prisma.rehearsal.create({
    data: { projectId, title: body.title, dateTime: new Date(body.dateTime), durationMinutes: body.durationMinutes || 60 },
  })
  revalidatePath(`/projects/${projectId}/rehearsals`)
  return NextResponse.json(rehearsal)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const rehearsal = await prisma.rehearsal.findUnique({ where: { id: body.id } })
  if (!rehearsal) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId: rehearsal.projectId } },
  })
  if (!member || !hasAnyRole(member.roles, ["director", "stage_manager"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const updated = await prisma.rehearsal.update({
    where: { id: body.id },
    data: { status: body.status },
  })
  revalidatePath(`/projects/${rehearsal.projectId}/rehearsals`)
  return NextResponse.json(updated)
}
