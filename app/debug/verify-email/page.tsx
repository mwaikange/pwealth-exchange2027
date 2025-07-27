"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function VerifyEmailDebug() {
  const [email, setEmail] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function handleVerifyEmail() {
    setLoading(true)
    setResult(null)

    try {
      // First, check if the user exists
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, email, email_confirmed_at")
        .eq("email", email)
        .single()

      if (userError) {
        setResult({ success: false, message: `Error checking user: ${userError.message}` })
        return
      }

      if (!userData) {
        setResult({ success: false, message: `User with email ${email} not found` })
        return
      }

      // If email is already confirmed
      if (userData.email_confirmed_at) {
        setResult({
          success: true,
          message: `Email ${email} is already confirmed (at ${userData.email_confirmed_at})`,
          userData,
        })
        return
      }

      // Try to manually confirm the email using admin functions
      const { data, error } = await fetch("/api/admin/confirm-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      }).then((res) => res.json())

      if (error) {
        setResult({ success: false, message: `Error confirming email: ${error}` })
      } else {
        setResult({ success: true, message: `Email ${email} confirmed successfully!`, data })
      }
    } catch (err: any) {
      setResult({ success: false, message: `Unexpected error: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Email Verification Debug Tool</h1>

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="user@example.com"
          />
        </div>

        <button
          onClick={handleVerifyEmail}
          disabled={loading || !email}
          className="w-full py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? "Processing..." : "Verify Email"}
        </button>

        {result && (
          <div className={`p-4 rounded ${result.success ? "bg-green-100" : "bg-red-100"}`}>
            <p className={result.success ? "text-green-700" : "text-red-700"}>{result.message}</p>
            {result.userData && (
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(result.userData, null, 2)}
              </pre>
            )}
            {result.data && (
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
