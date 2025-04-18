"use client"

import type React from "react"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function DebugLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toISOString()}: ${message}`])
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      addLog("Starting login attempt")

      // Direct Supabase authentication
      addLog("Calling supabase.auth.signInWithPassword")
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        addLog(`Auth error: ${error.message}`)
        setError(error.message)
        return
      }

      if (!data.user) {
        addLog("No user returned")
        setError("Invalid credentials")
        return
      }

      addLog(`Login successful for user: ${data.user.id}`)
      addLog("Redirecting to dashboard...")

      // Force a hard redirect to dashboard
      window.location.href = "/dashboard"
    } catch (err: any) {
      addLog(`Exception: ${err.message}`)
      setError(err.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg shadow-lg">
        <h1 className="text-xl font-bold mb-6">Debug Login Page</h1>

        {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md mb-4">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              required
            />
          </div>

          <div>
            <label className="block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-2">Debug Logs</h2>
          <div className="bg-black p-3 rounded-md text-xs font-mono h-40 overflow-y-auto">
            {logs.length > 0 ? (
              logs.map((log, i) => <div key={i}>{log}</div>)
            ) : (
              <div className="text-gray-500">No logs yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
