import type { Metadata } from "next"
import { ThemeProvider } from "@/src/components/ThemeProvider"
import "./globals.css"

export const metadata: Metadata = {
  title: "تیاتر | مدیریت تولید تئاتر",
  description: "سامانه مدیریت تولید تئاتر",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased" suppressHydrationWarning>
      <body className="relative min-h-full flex flex-col overflow-x-hidden">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-amber-200/20 blur-3xl dark:bg-amber-200/5" />
          <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-rose-200/20 blur-3xl dark:bg-rose-200/5" />
          <div className="absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-amber-100/10 blur-3xl dark:bg-amber-100/5" />
        </div>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
