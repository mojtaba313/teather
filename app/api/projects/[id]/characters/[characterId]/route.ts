import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { hasAnyRole } from "@/src/lib/roles"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: projectId, characterId } = await params
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
  })
  if (!member || !hasAnyRole(member.roles, ["writer", "director"]))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const body = await req.json()
  await prisma.character.update({
    where: { id: characterId },
    data: { name: body.name, description: body.description, age: body.age, gender: body.gender, image: body.image },
  })
  revalidatePath(`/projects/${projectId}/characters`)
  revalidatePath(`/projects/${projectId}/script`)
  return NextResponse.json({ ok: true })
}
