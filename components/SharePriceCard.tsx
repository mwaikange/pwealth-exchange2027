"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-singleton"

export default function SharePriceCard() {
  const [sharePrice, setSharePrice] = useState<number>(108.2)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSharePrice = async () => {
      try {
        const { data, error } = await supabase.rpc("get_current_share_price")
        if (error) throw error
        setSharePrice(Number(data) || 108.2)
      } catch (err) {
        console.error("Error fetching share price:", err)
        setSharePrice(108.2) // Fallback
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
        {loading ? "Loading..." : `N$${sharePrice.toFixed(2)}`}
      </div>
      <div className="text-gray-600 dark:text-gray-400">this week</div>
    </div>
  )
}
