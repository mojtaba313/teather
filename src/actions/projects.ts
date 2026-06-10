"use server"

import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { revalidatePath } from "next/cache"
import { hasAnyRole } from "@/src/lib/roles"

export async function updateProject(projectId: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
  })
  if (!member || !hasAnyRole(member.roles, ["director"]))
    throw new Error("فقط کارگردان می‌تواند پروژه را ویرایش کند")

  const title = formData.get("title") as string
  const description = formData.get("description") as string

  await prisma.project.update({
    where: { id: projectId },
    data: {
      title,
      description: description || null,
    },
  })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/settings`)
  revalidatePath("/dashboard")
}

export async function deleteProject(projectId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
  })
  if (!member || !hasAnyRole(member.roles, ["director"]))
    throw new Error("فقط کارگردان می‌تواند پروژه را حذف کند")

  await prisma.project.delete({ where: { id: projectId } })

  revalidatePath("/dashboard")
}
