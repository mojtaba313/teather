import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { hasAnyRole } from "@/src/lib/roles"

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
    select: {
      script: {
        include: { lockedByUser: { select: { id: true, name: true } } },
      },
    },
  })
  const script = project?.script
  if (!script) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({
    contentJson: script.contentJson,
    lockedBy: script.lockedByUser,
    lockedAt: script.lockedAt,
  })
}

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

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const project = await prisma.project.findUnique({
    where: { id },
    include: { script: { select: { id: true, lockedByUserId: true } } },
  })
  if (!project?.script) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (project.script.lockedByUserId !== session.user.id) {
    return NextResponse.json({ error: "Lock held by another user" }, { status: 403 })
  }
  await prisma.script.update({
    where: { id: project.script.id },
    data: { lockedByUserId: null, lockedAt: null },
  })
  return NextResponse.json({ success: true })
}
