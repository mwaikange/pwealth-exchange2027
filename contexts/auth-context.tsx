"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

const AuthContext = createContext<{
  user: any
  session: any
  loading: boolean
  signOut: () => Promise<void>
}>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Update the loadUserSession function to handle the case where user data might not exist yet
    const loadUserSession = async () => {
      try {
        setLoading(true)
        const supabase = createClientComponentClient()

        // Get the initial session
        const {
          data: { session },
        } = await supabase.auth.getSession()

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
          console.log("Auth state changed:", event)

          if (newSession) {
            setSession(newSession)
            setUser(newSession.user)
          } else {
            setSession(null)
            setUser(null)
          }

          // Only redirect on sign_out event
          if (event === "SIGNED_OUT") {
            router.push("/login")
          }
        })

        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error("Error loading auth session:", error)
      } finally {
        setLoading(false)
      }
    }

    loadUserSession()
  }, [router])

  const signOut = async () => {
    const supabase = createClientComponentClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  const value = { user, session, loading, signOut }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
