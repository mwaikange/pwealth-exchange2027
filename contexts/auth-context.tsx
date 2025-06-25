"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-singleton"

const AuthContext = createContext<{
  user: any
  session: any
  loading: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshSession: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refreshSession = async () => {
    try {
      console.log("🔄 Refreshing session...")
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error("❌ Session refresh error:", error)
        return
      }

      if (session) {
        console.log("✅ Session refreshed:", session.user.email)
        setSession(session)
        setUser(session.user)
      } else {
        console.log("⚠️ No session found during refresh")
        setSession(null)
        setUser(null)
      }
    } catch (error) {
      console.error("❌ Error refreshing session:", error)
    }
  }

  useEffect(() => {
    const loadUserSession = async () => {
      try {
        setLoading(true)
        console.log("🔐 AuthProvider: Loading user session...")

        // Get the initial session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("❌ Session error:", error)
          setSession(null)
          setUser(null)
          setLoading(false)
          return
        }

        console.log("🔐 Initial session check:", session ? `✅ Found: ${session.user.email}` : "❌ No session")

        if (session) {
          setSession(session)
          setUser(session.user)
        } else {
          setSession(null)
          setUser(null)
        }

        // Set up the auth state change listener
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          console.log("🔐 Auth state changed:", event)

          if (newSession) {
            console.log("✅ New session detected:", newSession.user.email)
            setSession(newSession)
            setUser(newSession.user)
          } else {
            console.log("❌ No session in auth state change")
            setSession(null)
            setUser(null)
          }

          // Only redirect on sign_out event
          if (event === "SIGNED_OUT") {
            console.log("🚪 User signed out, redirecting to login")
            router.push("/login")
          }
        })

        setLoading(false)

        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error("❌ Error loading auth session:", error)
        setLoading(false)
      }
    }

    loadUserSession()
  }, [router])

  const signOut = async () => {
    try {
      console.log("🚪 Signing out...")
      await supabase.auth.signOut()
      router.push("/login")
    } catch (error) {
      console.error("❌ Error signing out:", error)
    }
  }

  const value = { user, session, loading, signOut, refreshSession }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
