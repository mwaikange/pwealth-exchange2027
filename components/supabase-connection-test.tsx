"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase-singleton"

export function SupabaseConnectionTest() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userCount, setUserCount] = useState<number | null>(null)

  const testConnection = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Simple health check query
      const { data, error } = await supabase.from("health_check").select("*").limit(1).maybeSingle()

      if (error) {
        // If the health_check table doesn't exist, try a different approach
        if (error.code === "PGRST116") {
          // Try to get user count instead
          const { count, error: countError } = await supabase
            .from("app_users")
            .select("*", { count: "exact", head: true })

          if (countError) {
            throw countError
          }

          setUserCount(count)
          setIsConnected(true)
          return
        }

        throw error
      }

      setIsConnected(true)
    } catch (err: any) {
      console.error("Connection test failed:", err)
      setError(err.message || "Failed to connect to Supabase")
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Supabase Connection Test</CardTitle>
        <CardDescription>Verify that your application can connect to Supabase</CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected === null ? (
          <div className="flex items-center justify-center p-6">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isConnected ? (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-800">Connection Successful</AlertTitle>
            <AlertDescription className="text-green-700">
              Your application is successfully connected to Supabase.
              {userCount !== null && <p className="mt-2">Found {userCount} users in your database.</p>}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-red-50 border-red-200">
            <XCircle className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-800">Connection Failed</AlertTitle>
            <AlertDescription className="text-red-700">
              {error || "Unable to connect to Supabase. Please check your environment variables."}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={testConnection} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Testing Connection...
            </>
          ) : (
            "Test Connection Again"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
