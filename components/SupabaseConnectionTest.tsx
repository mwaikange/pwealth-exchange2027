"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

function SupabaseConnectionTest() {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.from("test").select("*").limit(1)

        if (error) {
          setError(error.message)
          setIsConnected(false)
        } else {
          setIsConnected(true)
          setError(null)
        }
      } catch (e: any) {
        setError(e.message)
        setIsConnected(false)
      }
    }

    checkConnection()
  }, [])

  return (
    <div>
      <h2>Supabase Connection Test</h2>
      {isConnected ? (
        <p style={{ color: "green" }}>Successfully connected to Supabase!</p>
      ) : (
        <p style={{ color: "red" }}>Failed to connect to Supabase. {error && `Error: ${error}`}</p>
      )}
    </div>
  )
}

export default SupabaseConnectionTest
