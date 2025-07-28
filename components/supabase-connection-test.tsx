"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function SupabaseConnectionTest() {
  const [connectionStatus, setConnectionStatus] = useState<"testing" | "connected" | "error">("testing")
  const [error, setError] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<any>(null)

  const testConnection = async () => {
    setConnectionStatus("testing")
    setError(null)
    setTestResults(null)

    try {
      // Test basic connection
      const { data, error } = await supabase.from("app_users").select("count", { count: "exact", head: true })

      if (error) {
        throw error
      }

      setTestResults({
        userCount: data,
        timestamp: new Date().toISOString(),
      })
      setConnectionStatus("connected")
    } catch (err: any) {
      setError(err.message)
      setConnectionStatus("error")
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Supabase Connection Test</CardTitle>
        <CardDescription>Testing connection to Supabase database</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Status:</span>
          <Badge
            variant={
              connectionStatus === "connected" ? "default" : connectionStatus === "error" ? "destructive" : "secondary"
            }
          >
            {connectionStatus === "testing" && "Testing..."}
            {connectionStatus === "connected" && "Connected"}
            {connectionStatus === "error" && "Error"}
          </Badge>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {testResults && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">Connection successful! Database accessible.</p>
            <p className="text-xs text-gray-500 mt-1">Tested at: {new Date(testResults.timestamp).toLocaleString()}</p>
          </div>
        )}

        <Button onClick={testConnection} disabled={connectionStatus === "testing"} className="w-full">
          {connectionStatus === "testing" ? "Testing..." : "Test Again"}
        </Button>
      </CardContent>
    </Card>
  )
}

export default SupabaseConnectionTest
