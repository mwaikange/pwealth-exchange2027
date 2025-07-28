"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-singleton"

export default function DebugPage() {
  const [sessionData, setSessionData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkSession() {
      try {
        console.log("[Debug] Checking session...")
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("[Debug] Error getting session:", error)
          setError(error.message)
          return
        }

        console.log("[Debug] Session data:", data)
        setSessionData(data)
      } catch (err: any) {
        console.error("[Debug] Unexpected error:", err)
        setError(err.message || "An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  async function handleSignOut() {
    try {
      await supabase.auth.signOut()
      window.location.href = "/login"
    } catch (err: any) {
      console.error("[Debug] Error signing out:", err)
      setError(err.message || "Error signing out")
    }
  }

  if (loading) {
    return (
      <div className="p-8 bg-gray-100 min-h-screen">
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">Session Debug</h1>
          <p>Loading session data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Session Debug</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Session Status</h2>
          <p className="mb-2">
            <span className="font-medium">Session Exists:</span>{" "}
            <span className={sessionData?.session ? "text-green-600" : "text-red-600"}>
              {sessionData?.session ? "Yes" : "No"}
            </span>
          </p>

          {sessionData?.session && (
            <>
              <p className="mb-2">
                <span className="font-medium">User ID:</span> {sessionData.session.user.id}
              </p>
              <p className="mb-2">
                <span className="font-medium">Email:</span> {sessionData.session.user.email}
              </p>
              <p className="mb-2">
                <span className="font-medium">Session Expires At:</span>{" "}
                {new Date(sessionData.session.expires_at * 1000).toLocaleString()}
              </p>
            </>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Actions</h2>
          <div className="flex space-x-4">
            <button onClick={handleSignOut} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Sign Out
            </button>
            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => (window.location.href = "/login")}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Go to Login
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Raw Session Data</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">{JSON.stringify(sessionData, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}
