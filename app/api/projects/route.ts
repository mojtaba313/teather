import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const { title, description } = await req.json()
    if (!title) return NextResponse.json({ error: "عنوان الزامی است" }, { status: 400 })
    const project = await prisma.project.create({
      data: {
        title,
        description,
        members: { create: { userId: session.user.id, roles: ["writer", "director"] } },
        script: { create: { contentJson: { scenes: [] } } },
      },
    })
    revalidatePath("/dashboard")
    return NextResponse.json(project)
  } catch {
    return NextResponse.json({ error: "خطا" }, { status: 500 })
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const memberships = await prisma.projectMember.findMany({
    where: { userId: session.user.id },
    include: { project: true },
    orderBy: { project: { updatedAt: "desc" } },
  })
  return NextResponse.json(memberships.map((m: { project: unknown }) => m.project))
}
