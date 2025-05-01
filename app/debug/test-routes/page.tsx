"use client"

import { useState } from "react"
import Link from "next/link"

export default function TestRoutes() {
  const [testResult, setTestResult] = useState<string | null>(null)

  const testRoute = async (route: string) => {
    try {
      const response = await fetch(route)
      setTestResult(`Route ${route}: ${response.status} ${response.statusText}`)
    } catch (error) {
      setTestResult(`Error testing route ${route}: ${error}`)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Route Testing Tool</h1>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">Test Routes</h2>
          <div className="space-y-2">
            <button
              onClick={() => testRoute("/verification-success")}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Test /verification-success
            </button>

            <button
              onClick={() => testRoute("/auth/callback")}
              className="px-4 py-2 bg-blue-500 text-white rounded ml-2"
            >
              Test /auth/callback
            </button>

            <button
              onClick={() => testRoute("/api/auth/email-confirmation")}
              className="px-4 py-2 bg-blue-500 text-white rounded ml-2"
            >
              Test /api/auth/email-confirmation
            </button>
          </div>
        </div>

        {testResult && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold">Test Result:</h3>
            <p>{testResult}</p>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Direct Links</h2>
          <div className="space-y-2">
            <div>
              <Link href="/verification-success" className="text-blue-500 hover:underline">
                Go to /verification-success
              </Link>
            </div>
            <div>
              <Link
                href="/auth/callback?token=test&type=signup&redirect_to=/verification-success"
                className="text-blue-500 hover:underline"
              >
                Simulate auth callback
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
