"use client"

import { useState, useEffect } from "react"
import { Wifi, WifiOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase-singleton"

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [isConnectedToSupabase, setIsConnectedToSupabase] = useState(true)
  const [isChecking, setIsChecking] = useState(false)

  // Check network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    // Set initial status
    setIsOnline(navigator.onLine)

    // Add event listeners
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Check Supabase connection
    checkSupabaseConnection()

    // Periodic check every 30 seconds
    const interval = setInterval(checkSupabaseConnection, 30000)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(interval)
    }
  }, [])

  const checkSupabaseConnection = async () => {
    try {
      // Simple health check query
      const { data, error } = await supabase.from("health_check").select("*").limit(1).maybeSingle()

      // If we get an error related to auth but not connection, still consider it connected
      if (error && !error.message.includes("Failed to fetch")) {
        console.log("Supabase connected but returned error:", error)
        setIsConnectedToSupabase(true)
        return
      }

      setIsConnectedToSupabase(!error)
    } catch (error) {
      console.error("Supabase connection check failed:", error)
      setIsConnectedToSupabase(false)
    }
  }

  const handleRetry = async () => {
    setIsChecking(true)
    await checkSupabaseConnection()
    setTimeout(() => setIsChecking(false), 1000) // Minimum 1s feedback
  }

  // If everything is fine, don't show anything
  if (isOnline && isConnectedToSupabase) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 max-w-xs">
        <div className="flex items-center">
          {isOnline ? (
            isConnectedToSupabase ? (
              <Wifi className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <WifiOff className="h-5 w-5 text-amber-500 mr-2" />
            )
          ) : (
            <WifiOff className="h-5 w-5 text-red-500 mr-2" />
          )}
          <div className="flex-1">
            {!isOnline ? (
              <p className="text-sm font-medium text-red-700">You are offline</p>
            ) : !isConnectedToSupabase ? (
              <p className="text-sm font-medium text-amber-700">Server connection issues</p>
            ) : null}
          </div>
          <Button size="sm" variant="outline" onClick={handleRetry} disabled={isChecking} className="ml-2">
            {isChecking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {!isOnline
            ? "Check your internet connection and try again."
            : "We're having trouble connecting to our servers. Some features may be unavailable."}
        </p>
      </div>
    </div>
  )
}
