import { auth, signIn } from "@/src/lib/auth"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/Card"
import { redirect } from "next/navigation"
import { AlertCircle } from "lucide-react"

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const s = await auth()
  if (s?.user) redirect("/dashboard")

  const { error } = await props.searchParams

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">ورود به تیاتر</CardTitle>
          <CardDescription>با نام کاربری و رمز عبور وارد شوید</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--red-border)] bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red-text)] mb-4 animate-fade-in-down">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error === "invalid" ? "نام کاربری یا رمز عبور اشتباه است" : "خطا در ورود. لطفاً دوباره تلاش کنید"}
            </div>
          )}
          <form
            className="space-y-4"
            action={async (formData) => {
              "use server"
              try {
                const result = await signIn("credentials", {
                  username: formData.get("username"),
                  password: formData.get("password"),
                  redirect: false,
                })
                if (result?.error) {
                  redirect("/login?error=invalid")
                }
                redirect("/dashboard")
              } catch {
                redirect("/login?error=unknown")
              }
            }}
          >
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1.5">نام کاربری</label>
              <Input id="username" name="username" required placeholder="نام کاربری خود را وارد کنید" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">رمز عبور</label>
              <Input id="password" name="password" type="password" required placeholder="رمز عبور خود را وارد کنید" />
            </div>
            <Button type="submit" className="w-full">ورود</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
