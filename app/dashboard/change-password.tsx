"use client"

import { useState } from "react"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { changeOwnPassword } from "@/src/actions/users"
import { KeyRound, CheckCircle, XCircle } from "lucide-react"

export function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "رمز عبور جدید باید حداقل ۶ کاراکتر باشد" })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      await changeOwnPassword(currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setMessage({ type: "success", text: "رمز عبور با موفقیت تغییر کرد" })
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "خطا در تغییر رمز عبور" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-[var(--green-border)] bg-[var(--green-bg)] text-[var(--green-text)]"
              : "border-[var(--red-border)] bg-[var(--red-bg)] text-[var(--red-text)]"
          }`}
        >
          {message.type === "success" ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
          {message.text}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">رمز عبور فعلی</label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            placeholder="رمز عبور فعلی"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">رمز عبور جدید</label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            placeholder="حداقل ۶ کاراکتر"
          />
        </div>
      </div>
      <Button type="submit" disabled={loading} className="gap-2">
        <KeyRound className="h-4 w-4" />
        {loading ? "در حال تغییر..." : "تغییر رمز عبور"}
      </Button>
    </form>
  )
}
