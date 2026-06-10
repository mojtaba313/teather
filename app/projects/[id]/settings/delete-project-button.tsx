"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/src/components/ui/Button"
import { Trash2, AlertTriangle, X } from "lucide-react"
import { deleteProject } from "@/src/actions/projects"

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setError(null)
    setLoading(true)
    try {
      await deleteProject(projectId)
      router.push("/dashboard")
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در حذف پروژه")
      setConfirming(false)
      setLoading(false)
    }
  }

  if (confirming) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center gap-2 rounded-xl border border-[var(--red-border)] bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red-text)]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>آیا از حذف این پروژه اطمینان دارید؟ این عمل غیرقابل بازگشت است.</span>
        </div>
        {error && (
          <p className="text-sm text-[var(--red-text)]">{error}</p>
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={loading} className="gap-2">
            <Trash2 className="h-4 w-4" />
            {loading ? "در حال حذف..." : "بله، حذف شود"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={loading} className="gap-2">
            <X className="h-4 w-4" />
            انصراف
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      className="gap-2"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="h-4 w-4" />
      حذف پروژه
    </Button>
  )
}
