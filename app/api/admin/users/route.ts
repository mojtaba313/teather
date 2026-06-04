import { auth } from "@/src/lib/auth"
import { prisma } from "@/src/lib/prisma"
import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isDirector = await prisma.projectMember.findFirst({
    where: { userId: session.user.id, roles: { has: "director" } },
  })
  if (!isDirector) {
    return NextResponse.json({ error: "فقط کارگردان می‌تواند کاربر جدید ایجاد کند" }, { status: 403 })
  }

  try {
    const { name, email, password } = await req.json()
    if (!name || !email || !password) {
      return NextResponse.json({ error: "همه فیلدها الزامی است" }, { status: 400 })
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return NextResponse.json({ error: "این ایمیل قبلاً ثبت شده است" }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)
    await prisma.user.create({ data: { name, email, password: hashed } })

    revalidatePath("/dashboard")
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "خطای داخلی" }, { status: 500 })
  }
}
