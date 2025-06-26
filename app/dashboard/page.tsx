"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import DemoDashboard from "./demo-dashboard"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [hasSupabase, setHasSupabase] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!supabase) {
          console.log("⚠️ Supabase not configured - showing demo dashboard")
          setHasSupabase(false)
          setIsCheckingAuth(false)
          return
        }

        setHasSupabase(true)

        // If we have auth context and it's not loading
        if (!loading) {
          if (!user) {
            console.log("❌ No user found, redirecting to login")
            router.replace("/login")
            return
          }

          console.log("✅ User authenticated:", user.email)
          setIsCheckingAuth(false)
        }
      } catch (error) {
        console.error("❌ Error checking auth:", error)
        setHasSupabase(false)
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [user, loading, router])

  // Show loading while checking authentication
  if (isCheckingAuth || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // If no Supabase or demo mode, show demo dashboard
  if (!hasSupabase) {
    return <DemoDashboard />
  }

  // If we have Supabase but no user, redirect to login
  if (!user) {
    router.replace("/login")
    return null
  }

  // Show the real dashboard (you can import your existing dashboard component here)
  return <DemoDashboard />
}
