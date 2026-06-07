"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { useState } from "react"
import { Theater, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

export default function NewProjectPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/projects", {
      method: "POST",
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
      }),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/projects/${data.id}`)
    } else {
      const data = await res.json()
      setError(data.error || "خطا در ایجاد پروژه")
    }
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <div className="decorative-blur -top-40 -right-40 h-80 w-80 bg-[var(--blur-circle-1)]" />
      <div className="decorative-blur -bottom-40 -left-40 h-80 w-80 bg-[var(--blur-circle-2)]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="mx-auto max-w-xl w-full space-y-6 md:space-y-8">
      <div className="animate-fade-in">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          بازگشت به داشبورد
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">پروژه جدید</h1>
      </div>
      <Card className="animate-fade-in-1">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Theater className="h-5 w-5 text-[var(--muted)]" />
            <CardTitle>اطلاعات پروژه</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-[var(--red-border)] bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red-text)]">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1.5 text-[var(--muted)]">
                عنوان پروژه
              </label>
              <Input id="title" name="title" required placeholder="عنوان پروژه" />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1.5 text-[var(--muted)]">
                توضیحات
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm shadow-sm backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-[var(--input-focus-border)]"
                placeholder="توضیحات (اختیاری)"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال ایجاد...
                </>
              ) : (
                <>
                  <Theater className="h-4 w-4" />
                  ایجاد پروژه
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
