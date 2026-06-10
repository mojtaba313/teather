"use server"

import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"

export async function updateUser(userId: string, data: { name?: string; username?: string }) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const isDirector = await prisma.projectMember.findFirst({
    where: { userId: session.user.id, roles: { has: "director" } },
  })
  if (!isDirector) throw new Error("فقط کارگردان می‌تواند کاربران را ویرایش کند")

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.username !== undefined && { username: data.username }),
    },
  })

  revalidatePath("/admin/users")
}

export async function changeUserPassword(userId: string, newPassword: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const isDirector = await prisma.projectMember.findFirst({
    where: { userId: session.user.id, roles: { has: "director" } },
  })
  if (!isDirector) throw new Error("فقط کارگردان می‌تواند رمز عبور را تغییر دهد")

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  })

  revalidatePath("/admin/users")
}

export async function deleteUser(userId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  if (session.user.id === userId) throw new Error("نمی‌توانید خودتان را حذف کنید")

  const isDirector = await prisma.projectMember.findFirst({
    where: { userId: session.user.id, roles: { has: "director" } },
  })
  if (!isDirector) throw new Error("فقط کارگردان می‌تواند کاربران را حذف کند")

  await prisma.user.delete({ where: { id: userId } })

  revalidatePath("/admin/users")
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user || !user.password) throw new Error("کاربر یافت نشد")

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) throw new Error("رمز عبور فعلی نادرست است")

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  })

  revalidatePath("/dashboard")
}
