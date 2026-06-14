"use server"

import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import { revalidatePath } from "next/cache"
import { hasAnyRole } from "@/src/lib/roles"
import type { Prisma } from "@prisma/client"

const LOCK_TIMEOUT_MS = 60_000

export async function acquireScriptLock(scriptId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const script = await prisma.script.findUnique({
    where: { id: scriptId },
    include: { lockedByUser: { select: { id: true, name: true } } },
  })
  if (!script) throw new Error("Script not found")

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId: script.projectId } },
  })
  if (!member || !hasAnyRole(member.roles, ["writer", "director"]))
    throw new Error("Forbidden")

  // Check if lock is held by someone else and not expired
  if (script.lockedByUserId && script.lockedByUserId !== session.user.id) {
    const elapsed = Date.now() - (script.lockedAt?.getTime() ?? 0)
    if (elapsed < LOCK_TIMEOUT_MS) {
      return { locked: false, lockedBy: script.lockedByUser?.name ?? "someone", lockedAt: script.lockedAt?.toISOString() }
    }
  }

  const now = new Date()
  await prisma.script.update({
    where: { id: scriptId },
    data: { lockedByUserId: session.user.id, lockedAt: now },
  })

  return { locked: true, lockedBy: session.user.name, lockedAt: now.toISOString() }
}

export async function releaseScriptLock(scriptId: string) {
  const session = await auth()
  if (!session?.user?.id) return

  const script = await prisma.script.findUnique({ where: { id: scriptId }, select: { lockedByUserId: true } })
  if (script?.lockedByUserId === session.user.id) {
    await prisma.script.update({
      where: { id: scriptId },
      data: { lockedByUserId: null, lockedAt: null },
    })
  }
}

export async function endEditingSession(scriptId: string, contentJson: unknown) {
  const session = await auth()
  if (!session?.user?.id) return

  const script = await prisma.script.findUnique({ where: { id: scriptId }, include: { project: { select: { id: true } } } })
  if (!script) return

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId: script.project.id } },
  })
  if (!member || !hasAnyRole(member.roles, ["writer", "director"])) return

  await prisma.script.update({
    where: { id: scriptId },
    data: {
      contentJson: contentJson as Prisma.InputJsonValue,
      lockedByUserId: null,
      lockedAt: null,
    },
  })

  revalidatePath(`/projects/${script.project.id}/script`)
}

export async function heartbeatScriptLock(scriptId: string) {
  const session = await auth()
  if (!session?.user?.id) return

  const script = await prisma.script.findUnique({
    where: { id: scriptId },
    select: { lockedByUserId: true },
  })
  if (script?.lockedByUserId === session.user.id) {
    await prisma.script.update({
      where: { id: scriptId },
      data: { lockedAt: new Date() },
    })
  }
}

export async function persistScript(scriptId: string, contentJson: unknown) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const script = await prisma.script.findUnique({ where: { id: scriptId } })
  if (!script) throw new Error("Script not found")

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId: script.projectId } },
  })
  if (!member || !hasAnyRole(member.roles, ["writer", "director"]))
    throw new Error("Forbidden")

  await prisma.script.update({
    where: { id: scriptId },
    data: { contentJson: contentJson as Prisma.InputJsonValue },
  })

  revalidatePath(`/projects/${script.projectId}/script`)
}
