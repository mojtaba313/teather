import { auth } from "@/src/lib/auth"
import { redirect } from "next/navigation"
import { signIn } from "@/src/lib/auth"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/Card"

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) redirect("/dashboard")

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">ورود به تیاتر</CardTitle>
          <CardDescription>با ایمیل و رمز عبور وارد شوید</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={async (formData) => {
            "use server"
            await signIn("credentials", formData)
          }}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">ایمیل</label>
              <Input id="email" name="email" type="email" required placeholder="your@email.com" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">رمز عبور</label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full">ورود</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
