"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-singleton"

export default function SharePriceCard() {
  const [sharePrice, setSharePrice] = useState<number>(108.2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSharePrice = async () => {
      try {
        setError(null)

        // Try to get current share price using RPC function
        let price = 108.2
        try {
          const { data, error } = await supabase.rpc("get_current_share_price")
          if (!error && data !== null) {
            price = Number(data)
          } else {
            // Fallback: get latest price from weekly_prices table
            const { data: weeklyPrice, error: weeklyError } = await supabase
              .from("weekly_prices")
              .select("final_price")
              .order("effective_date", { ascending: false })
              .limit(1)
              .single()

            if (!weeklyError && weeklyPrice) {
              price = Number(weeklyPrice.final_price)
            }
          }
        } catch (rpcError) {
          console.warn("RPC function not available, using fallback:", rpcError)

          // Direct table query fallback
          const { data: weeklyPrice, error: weeklyError } = await supabase
            .from("weekly_prices")
            .select("final_price")
            .order("effective_date", { ascending: false })
            .limit(1)
            .single()

          if (!weeklyError && weeklyPrice) {
            price = Number(weeklyPrice.final_price)
          }
        }

        setSharePrice(price)
      } catch (err: any) {
        console.error("Error fetching share price:", err)
        setError(err.message || "Failed to fetch share price")
        setSharePrice(108.2) // Fallback price
      } finally {
        setLoading(false)
      }
    }

    fetchSharePrice()

    // Refresh price every 5 minutes
    const interval = setInterval(fetchSharePrice, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="border-l-4 border-gray-400 dark:border-gray-600 pl-4">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">SHARE PRICE</h1>
      <div className="text-5xl font-bold text-black dark:text-white mb-2">
        {loading ? (
          <div className="animate-pulse bg-gray-300 dark:bg-gray-700 h-12 w-48 rounded"></div>
        ) : (
          `N$${sharePrice.toFixed(2)}`
        )}
      </div>
      <div className="text-gray-600 dark:text-gray-400">
        {error ? <span className="text-red-500 text-sm">Using fallback price</span> : "this week"}
      </div>
    </div>
  )
}
