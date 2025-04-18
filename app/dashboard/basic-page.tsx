"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function BasicDashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getUser() {
      try {
        const { data, error } = await supabase.auth.getUser()
        if (error) {
          console.error("Error fetching user:", error.message)
          return
        }
        setUser(data.user)
      } catch (err) {
        console.error("Unexpected error:", err)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [])

  if (loading) {
    return <div className="p-8">Loading user data...</div>
  }

  if (!user) {
    return <div className="p-8">Not authenticated. Please log in.</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl mb-2">User Information</h2>
        <p>Email: {user.email}</p>
        <p>ID: {user.id}</p>
        <p>Last Sign In: {new Date(user.last_sign_in_at).toLocaleString()}</p>
      </div>
    </div>
  )
}
