import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"

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
    <html lang="en" suppressHydrationWarning className="overflow-hidden">
      <body className={`${inter.className} bg-[#1c1e26] text-white overflow-hidden`}>{children}</body>
    </html>
  )
}


import './globals.css'