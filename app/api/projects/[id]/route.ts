import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId: id } },
  })
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      _count: { select: { characters: true, rehearsals: true, performances: true, members: true } },
      members: { include: { user: true } },
    },
  })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ project, roles: member.roles })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId: id } },
  })
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const body = await req.json()
  const project = await prisma.project.update({
    where: { id },
    data: { status: body.status, title: body.title, description: body.description },
  })
  revalidatePath(`/projects/${id}`)
  return NextResponse.json(project)
}
