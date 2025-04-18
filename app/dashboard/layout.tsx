"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { WalletProvider } from "@/contexts/wallet-context"
import { TransactionProvider } from "@/contexts/transaction-context"
import { VestingProvider } from "@/contexts/vesting-context"
import { supabase } from "@/lib/supabaseClient"

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
        // Add a small delay to ensure Supabase is fully initialized
        await new Promise((resolve) => setTimeout(resolve, 500))

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!isMounted) return

        if (session) {
          console.log("[DashboardLayout] Session is ACTIVE", session.user.id)
          setHasSession(true)
        } else {
          console.warn("[DashboardLayout] No session, redirecting to login")
          router.replace("/login")
        }

        setSessionChecked(true)
      } catch (error) {
        console.error("[DashboardLayout] Error checking session:", error)
        if (isMounted) {
          router.replace("/login")
        }
      }
    }

    check()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[DashboardLayout] Auth changed:", event)

      if (session) {
        console.log("[DashboardLayout] Auth changed: session ACTIVE", session.user.id)
        setHasSession(true)
      } else {
        console.warn("[DashboardLayout] Auth changed: session NULL")
        router.replace("/login")
      }
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [router])

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

  if (!hasSession) {
    return null
  }

  return (
    <WalletProvider>
      <TransactionProvider>
        <VestingProvider>
          <div className="flex flex-col h-screen max-h-[960px] bg-[#1c1e26] text-white overflow-hidden">{children}</div>
        </VestingProvider>
      </TransactionProvider>
    </WalletProvider>
  )
}
