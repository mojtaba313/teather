import { auth, signIn } from "@/src/lib/auth"
import { Button } from "@/src/components/ui/Button"
import { Input } from "@/src/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/Card"
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const s = await auth();
  if (s?.user) redirect('/dashboard')
  
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">ورود به تیاتر</CardTitle>
          <CardDescription>با نام کاربری و رمز عبور وارد شوید</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={async (formData) => {
            "use server"
            await signIn("credentials", formData)
          }}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1.5">نام کاربری</label>
              <Input id="username" name="username" required placeholder="نام کاربری خود را وارد کنید" />
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
