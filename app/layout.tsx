import type { Metadata } from "next"
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
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
