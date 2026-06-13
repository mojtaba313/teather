"use client"

import { useState } from "react"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/Card"
import { Plus, X, Loader2, Calendar } from "lucide-react"
import { Portal } from "@/src/components/ui/Portal"
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
    return (
      <Button onClick={() => setOpen(true)} className="gap-2 w-full sm:w-auto">
        <Plus className="h-4 w-4" />
        تمرین جدید
      </Button>
    )
  }

  return (
    <Portal>
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <Card
        className="w-full max-w-md mx-4 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[var(--muted)]" />
              <CardTitle>تمرین جدید</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">عنوان</label>
              <Input name="title" required placeholder="عنوان تمرین" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">تاریخ و ساعت</label>
              <Input name="dateTime" type="datetime-local" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">مدت (دقیقه)</label>
              <Input name="durationMinutes" type="number" defaultValue={60} min={1} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="flex-1 gap-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                {loading ? "..." : "ایجاد تمرین"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                انصراف
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
    </Portal>
  )
}
