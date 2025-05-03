import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Peer Wealth Token",
  description: "Peer Wealth Token Platform",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#1c1e26] text-white`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
