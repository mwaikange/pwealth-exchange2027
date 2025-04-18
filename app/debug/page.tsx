"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-singleton"

export default function DebugPage() {
  const [sessionData, setSessionData] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkSession() {
      try {
        setLoading(true)

        // Get session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        setSessionData(session)

        if (session?.user) {
          setUserData(session.user)
        }
      } catch (err: any) {
        console.error("Debug error:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Auth Debug Page</h1>

      {loading ? (
        <div className="animate-pulse">Loading session data...</div>
      ) : error ? (
        <div className="bg-red-500/20 border border-red-500 p-4 rounded-md">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gray-800 p-4 rounded-md">
            <h2 className="text-xl font-semibold mb-2">Session Status</h2>
            <p className="mb-2">
              Session:{" "}
              <span className={sessionData ? "text-green-400" : "text-red-400"}>
                {sessionData ? "Active" : "Not Active"}
              </span>
            </p>
            {sessionData && (
              <div>
                <p>Expires: {new Date(sessionData.expires_at * 1000).toLocaleString()}</p>
                <p>Provider: {sessionData.provider}</p>
              </div>
            )}
          </div>

          {userData && (
            <div className="bg-gray-800 p-4 rounded-md">
              <h2 className="text-xl font-semibold mb-2">User Data</h2>
              <p>ID: {userData.id}</p>
              <p>Email: {userData.email}</p>
              <p>Created: {new Date(userData.created_at).toLocaleString()}</p>
              <p>
                Last Sign In: {userData.last_sign_in_at ? new Date(userData.last_sign_in_at).toLocaleString() : "N/A"}
              </p>
            </div>
          )}

          <div className="bg-gray-800 p-4 rounded-md">
            <h2 className="text-xl font-semibold mb-2">Actions</h2>
            <div className="flex space-x-4">
              <button
                onClick={async () => {
                  await supabase.auth.refreshSession()
                  window.location.reload()
                }}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md"
              >
                Refresh Session
              </button>

              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  window.location.href = "/login"
                }}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
