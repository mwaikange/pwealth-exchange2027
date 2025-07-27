"use client"

import type React from "react"

import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { HeaderWithWallet } from "@/components/HeaderWithWallet"
import { NotificationSlider } from "@/components/NotificationSlider"
import { SlidingNotification } from "@/components/sliding-notification"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <HeaderWithWallet />
          <main className="flex-1 p-6 relative">
            {children}
            {/* Notification Slider positioned inside the application */}
            <div className="fixed top-20 right-4 z-50">
              <NotificationSlider />
            </div>
            {/* Sliding Notification for general notifications */}
            <SlidingNotification />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
