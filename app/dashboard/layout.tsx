"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { WalletProvider } from "@/contexts/wallet-context"
import { TransactionProvider } from "@/contexts/transaction-context"
import { VestingProvider } from "@/contexts/vesting-context"
import { supabase } from "@/lib/supabase-singleton"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardSidebar } from "@/components/dashboard-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sessionChecked, setSessionChecked] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const check = async () => {
      try {
        console.log("[DashboardLayout] Checking session...")

        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!isMounted) return

        if (session) {
          console.log("[DashboardLayout] Session is ACTIVE", session.user.id)
          setHasSession(true)
          setSessionChecked(true)
        } else {
          console.warn("[DashboardLayout] No session found, redirecting to login")
          router.replace("/login")
          return
        }
      } catch (error) {
        console.error("[DashboardLayout] Error checking session:", error)
        if (isMounted) {
          router.replace("/login")
        }
      }
    }

    // Run the check
    check()

    // Set up auth listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("[DashboardLayout] Auth state changed:", event)

      // Only redirect on explicit sign out, not during initial session check
      if (event === "SIGNED_OUT" && !newSession) {
        console.warn("[DashboardLayout] User signed out")
        router.replace("/login")
        return
      }
    })

    // Cleanup function
    return () => {
      isMounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [router])

  // Show loading state while checking session
  if (!sessionChecked) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1c1e26] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p>Checking session...</p>
        </div>
      </div>
    )
  }

  // Only render children if we have a session
  if (!hasSession) {
    return null
  }

  return (
    <WalletProvider>
      <TransactionProvider>
        <VestingProvider>
          <div className="flex flex-col h-screen bg-[#1e2130] text-white overflow-hidden">
            <DashboardHeader />
            <div className="flex flex-1 overflow-hidden">
              <DashboardSidebar />
              <main className="flex-1 overflow-auto p-4">{children}</main>
            </div>
          </div>
        </VestingProvider>
      </TransactionProvider>
    </WalletProvider>
  )
}
