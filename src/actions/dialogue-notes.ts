"use server"

import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { revalidatePath } from "next/cache"

export async function toggleMemorized(key: string, projectId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const existing = await prisma.dialogueNote.findUnique({
    where: { key_userId: { key, userId: session.user.id } },
  })

  if (existing) {
    await prisma.dialogueNote.update({
      where: { id: existing.id },
      data: { memorized: !existing.memorized },
    })
  } else {
    await prisma.dialogueNote.create({
      data: { key, userId: session.user.id, memorized: true },
    })
  }

  revalidatePath(`/projects/${projectId}/my-roles`)
}

export async function saveDialogueNote(key: string, notes: string, projectId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const existing = await prisma.dialogueNote.findUnique({
    where: { key_userId: { key, userId: session.user.id } },
  })

  if (existing) {
    await prisma.dialogueNote.update({
      where: { id: existing.id },
      data: { notes },
    })
  } else {
    await prisma.dialogueNote.create({
      data: { key, userId: session.user.id, notes },
    })
  }

  revalidatePath(`/projects/${projectId}/my-roles`)
}
