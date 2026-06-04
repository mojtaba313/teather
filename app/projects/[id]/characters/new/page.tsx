"use client"

import { useRouter, useParams } from "next/navigation"
import { useState } from "react"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { Card, CardContent } from "@/src/components/ui/Card"

export default function NewCharacterPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const form = new FormData(e.currentTarget)
    const res = await fetch(`/api/projects/${id}/characters`, {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
        age: form.get("age") ? Number(form.get("age")) : null,
        gender: form.get("gender"),
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">شخصیت جدید</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <label className="block text-sm font-medium mb-1.5">نام شخصیت</label>
              <Input name="name" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">توضیحات</label>
              <textarea name="description" rows={3} className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">سن</label>
                <Input name="age" type="number" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">جنسیت</label>
                <select name="gender" className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm">
                  <option value="">انتخاب...</option>
                  <option value="مرد">مرد</option>
                  <option value="زن">زن</option>
                  <option value="غیره">غیره</option>
                </select>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "..." : "ایجاد شخصیت"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
