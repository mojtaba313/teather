"use client"

import { useState } from "react"
import { Card, CardContent } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { Badge } from "@/src/components/ui/Badge"
import { Pencil, Trash2, KeyRound, Save, X, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { updateUser, deleteUser, changeUserPassword } from "@/src/actions/users"

type User = {
  id: string
  name: string
  username: string
  _count: { memberships: number }
}

export function UserManagement({
  users,
  currentUserId,
}: {
  users: User[]
  currentUserId: string
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [changingPassId, setChangingPassId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editUsername, setEditUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  function showMessage(type: "success" | "error", text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleEdit(userId: string) {
    try {
      await updateUser(userId, { name: editName, username: editUsername })
      setEditingId(null)
      showMessage("success", "کاربر با موفقیت ویرایش شد")
    } catch (e) {
      showMessage("error", e instanceof Error ? e.message : "خطا در ویرایش کاربر")
    }
  }

  async function handleChangePassword(userId: string) {
    if (newPassword.length < 6) {
      showMessage("error", "رمز عبور باید حداقل ۶ کاراکتر باشد")
      return
    }
    try {
      await changeUserPassword(userId, newPassword)
      setChangingPassId(null)
      setNewPassword("")
      showMessage("success", "رمز عبور با موفقیت تغییر کرد")
    } catch (e) {
      showMessage("error", e instanceof Error ? e.message : "خطا در تغییر رمز عبور")
    }
  }

  async function handleDelete(userId: string) {
    try {
      await deleteUser(userId)
      setDeletingId(null)
      showMessage("success", "کاربر با موفقیت حذف شد")
    } catch (e) {
      showMessage("error", e instanceof Error ? e.message : "خطا در حذف کاربر")
    }
  }

  return (
    <>
      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm animate-fade-in-down ${
            message.type === "success"
              ? "border-[var(--green-border)] bg-[var(--green-bg)] text-[var(--green-text)]"
              : "border-[var(--red-border)] bg-[var(--red-bg)] text-[var(--red-text)]"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {users.map((user) => (
        <Card key={user.id}>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--badge-bg)] text-sm font-medium text-[var(--muted)]">
                  {user.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.name}
                    {user.id === currentUserId && (
                      <Badge variant="outline" className="mr-2">شما</Badge>
                    )}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">@{user.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline">{user._count.memberships} پروژه</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingId(editingId === user.id ? null : user.id)
                    setEditName(user.name)
                    setEditUsername(user.username)
                    setChangingPassId(null)
                    setDeletingId(null)
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setChangingPassId(changingPassId === user.id ? null : user.id)
                    setNewPassword("")
                    setEditingId(null)
                    setDeletingId(null)
                  }}
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
                {user.id !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[var(--red-text)] hover:bg-[var(--red-bg)]"
                    onClick={() => {
                      setDeletingId(deletingId === user.id ? null : user.id)
                      setEditingId(null)
                      setChangingPassId(null)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {editingId === user.id && (
              <div className="mt-4 pt-4 border-t border-[var(--card-border)] space-y-3 animate-fade-in">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">نام</label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">نام کاربری</label>
                    <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleEdit(user.id)} className="gap-1">
                    <Save className="h-3.5 w-3.5" />
                    ذخیره
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="gap-1">
                    <X className="h-3.5 w-3.5" />
                    انصراف
                  </Button>
                </div>
              </div>
            )}

            {changingPassId === user.id && (
              <div className="mt-4 pt-4 border-t border-[var(--card-border)] space-y-3 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[var(--muted)]">رمز عبور جدید</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="حداقل ۶ کاراکتر"
                    minLength={6}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleChangePassword(user.id)} className="gap-1">
                    <KeyRound className="h-3.5 w-3.5" />
                    تغییر رمز عبور
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setChangingPassId(null)} className="gap-1">
                    <X className="h-3.5 w-3.5" />
                    انصراف
                  </Button>
                </div>
              </div>
            )}

            {deletingId === user.id && (
              <div className="mt-4 pt-4 border-t border-[var(--card-border)] space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 rounded-xl border border-[var(--red-border)] bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red-text)]">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    آیا از حذف کاربر <strong>{user.name}</strong> اطمینان دارید؟ تمامی دسترسی‌های این کاربر به پروژه‌ها حذف خواهد شد.
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(user.id)} className="gap-1">
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف کاربر
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDeletingId(null)} className="gap-1">
                    <X className="h-3.5 w-3.5" />
                    انصراف
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </>
  )
}
