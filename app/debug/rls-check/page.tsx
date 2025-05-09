"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RlsCheckPage() {
  const [rlsStatus, setRlsStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function checkRls() {
    try {
      setLoading(true)
      setError(null)

      // Import the server action dynamically
      const { checkRlsStatus } = await import("@/utils/check-rls")

      // Call the server action
      const result = await checkRlsStatus()

      setRlsStatus(result)
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">RLS Status Check</h1>

      <Card>
        <CardHeader>
          <CardTitle>Row Level Security Status</CardTitle>
          <CardDescription>Check if RLS is enabled and what policies exist</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={checkRls} disabled={loading}>
            {loading ? "Checking..." : "Check RLS Status"}
          </Button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {rlsStatus && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">RLS Status:</h3>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
                {JSON.stringify(rlsStatus, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
