"use client"

import { useRouter, useParams } from "next/navigation"
import { useState, useRef } from "react"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { Card, CardContent } from "@/src/components/ui/Card"
import { ImageUp, ArrowLeft, Users } from "lucide-react"
import Link from "next/link"

export default function NewCharacterPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const form = new FormData(e.currentTarget)
    const file = form.get("image") as File | null
    let imageUrl = ""

    if (file && file.size > 0) {
      const uploadForm = new FormData()
      uploadForm.set("file", file)
      const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadForm })
      if (uploadRes.ok) {
        const { url } = await uploadRes.json()
        imageUrl = url
      }
    }

    const res = await fetch(`/api/projects/${id}/characters`, {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
        age: form.get("age") ? Number(form.get("age")) : null,
        gender: form.get("gender"),
        image: imageUrl || null,
      }),
    })
    if (res.ok) {
      router.push(`/projects/${id}/characters`)
    } else {
      const data = await res.json()
      setError(data.error || "خطا")
    }
    setLoading(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setPreview(URL.createObjectURL(file))
    }
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <div className="decorative-blur -top-40 -right-40 h-80 w-80 bg-[var(--blur-circle-1)]" />
      <div className="decorative-blur -bottom-40 -left-40 h-80 w-80 bg-[var(--blur-circle-2)]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="mx-auto max-w-xl w-full space-y-6 md:space-y-8">
          <div className="animate-fade-in">
            <Link
              href={`/projects/${id}/characters`}
              className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              بازگشت به شخصیت‌ها
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">شخصیت جدید</h1>
          </div>
          <Card className="animate-fade-in-1">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-[var(--red-border)] bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red-text)]">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">نام شخصیت</label>
                  <Input name="name" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">توضیحات</label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm shadow-sm backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-[var(--input-focus-border)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">سن</label>
                    <Input name="age" type="number" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">جنسیت</label>
                    <select
                      name="gender"
                      className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--select-bg)] px-3 py-2 text-sm shadow-sm backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                    >
                      <option value="">انتخاب...</option>
                      <option value="مرد">مرد</option>
                      <option value="زن">زن</option>
                      <option value="غیره">غیره</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">تصویر</label>
                  <input
                    ref={fileRef}
                    name="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[var(--input-border)] bg-[var(--input-bg)] p-4 text-sm text-[var(--muted)] transition-all duration-200 hover:border-[var(--accent)] hover:bg-[var(--card-bg)]"
                  >
                    <ImageUp className="h-5 w-5" />
                    {preview ? "تغییر تصویر" : "انتخاب تصویر"}
                  </div>
                  {preview && (
                    <div className="mt-2">
                      <img
                        src={preview}
                        alt="preview"
                        className="h-24 w-24 rounded-xl object-cover ring-2 ring-[var(--card-border)]"
                      />
                    </div>
                  )}
                </div>
                <Button type="submit" disabled={loading} className="w-full gap-2">
                  {loading ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ...
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4" />
                      ایجاد شخصیت
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
