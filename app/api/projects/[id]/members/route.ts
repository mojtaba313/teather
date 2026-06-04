import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { hasAnyRole } from "@/src/lib/roles"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { projectId, email, roles } = body
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
  })
  if (!member || !hasAnyRole(member.roles, ["director"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })
  const existing = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: user.id, projectId } },
  })
  if (existing) return NextResponse.json({ error: "کاربر قبلاً عضو است" }, { status: 400 })
  await prisma.projectMember.create({
    data: { userId: user.id, projectId, roles: roles || ["viewer"] },
  })
  revalidatePath(`/projects/${projectId}/settings`)
  return NextResponse.json({ ok: true })
}
