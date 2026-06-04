"use client"

import { useState } from "react"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export function RehearsalForm({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const res = await fetch(`/api/projects/${projectId}/rehearsals`, {
      method: "POST",
      body: JSON.stringify({
        title: form.get("title"),
        dateTime: form.get("dateTime"),
        durationMinutes: Number(form.get("durationMinutes")) || 60,
      }),
    })
    if (res.ok) {
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}><Plus className="ml-2 h-4 w-4" />تمرین جدید</Button>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">تمرین جدید</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">عنوان</label>
            <Input name="title" required placeholder="عنوان تمرین" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">تاریخ و ساعت</label>
            <Input name="dateTime" type="datetime-local" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">مدت (دقیقه)</label>
            <Input name="durationMinutes" type="number" defaultValue={60} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">{loading ? "..." : "ایجاد"}</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
