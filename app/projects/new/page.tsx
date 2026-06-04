"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { Card, CardContent } from "@/src/components/ui/Card"
import { useState } from "react"

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
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">پروژه جدید</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1.5">عنوان پروژه</label>
              <Input id="title" name="title" required placeholder="عنوان پروژه" />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1.5">توضیحات</label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="flex w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
                placeholder="توضیحات (اختیاری)"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "در حال ایجاد..." : "ایجاد پروژه"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
