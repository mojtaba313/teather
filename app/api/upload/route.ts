import { auth } from "@/src/lib/auth"
import { NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import path from "path"
import crypto from "crypto"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "فایلی ارسال نشده است" }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!ext || !["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
      return NextResponse.json({ error: "فرمت فایل مجاز نیست" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${crypto.randomUUID()}.${ext}`
    const filepath = path.join(process.cwd(), "public", "uploads", filename)
    await writeFile(filepath, buffer)

    return NextResponse.json({ url: `/uploads/${filename}` })
  } catch {
    return NextResponse.json({ error: "خطا در آپلود فایل" }, { status: 500 })
  }
}
