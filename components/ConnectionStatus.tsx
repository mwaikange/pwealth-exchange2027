"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

const ConnectionStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Attempt a simple query to check the connection
        await supabase.from("profiles").select("id").limit(1)
        setIsConnected(true)
      } catch (error) {
        console.error("Database connection error:", error)
        setIsConnected(false)
      }
    }

    checkConnection() // Initial check

    const intervalId = setInterval(checkConnection, 5000) // Check every 5 seconds

    return () => clearInterval(intervalId) // Cleanup on unmount
  }, [])

  let statusMessage
  if (isConnected === null) {
    statusMessage = "Checking connection..."
  } else if (isConnected) {
    statusMessage = "Connected to database"
  } else {
    statusMessage = "Not connected to database"
  }

  return (
    <div>
      <p>Connection Status: {statusMessage}</p>
    </div>
  )
}

export default ConnectionStatus
