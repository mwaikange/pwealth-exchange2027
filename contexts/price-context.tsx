"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

interface PriceData {
  currentPrice: number
  priceChange: number
  priceChangePercentage: number
  j200Growth: number
  lastUpdated: Date | null
}

interface PriceHistory {
  date: string
  price: number
  j200_growth: number
  price_change: number
  created_at: string
}

interface PriceContextType {
  priceData: PriceData
  priceHistory: PriceHistory[]
  loading: boolean
  error: string | null
  refreshPriceData: () => Promise<void>
}

const PriceContext = createContext<PriceContextType | undefined>(undefined)

export function PriceProvider({ children }: { children: React.ReactNode }) {
  const [priceData, setPriceData] = useState<PriceData>({
    currentPrice: 108.2,
    priceChange: 0,
    priceChangePercentage: 0,
    j200Growth: 0,
    lastUpdated: null,
  })
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshPriceData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Fetching simplified price data...")

      // Fetch current price using the new simplified function
      const { data: currentPriceData, error: priceError } = await supabase.rpc("get_current_share_price")

      if (priceError) {
        console.error("❌ Price error:", priceError)
        throw new Error(`Failed to fetch current price: ${priceError.message}`)
      }

      // Ensure price is a valid number
      const currentPrice = Number(currentPriceData) || 108.2
      const safeCurrentPrice = isNaN(currentPrice) ? 108.2 : currentPrice

      console.log("📊 Current price fetched:", safeCurrentPrice)

      // Fetch latest weekly price data for additional info
      const { data: latestWeeklyData, error: weeklyError } = await supabase
        .from("weekly_prices")
        .select("final_price, price_change, j200_growth, created_at")
        .order("effective_date", { ascending: false })
        .limit(1)
        .single()

      if (weeklyError && weeklyError.code !== "PGRST116") {
        console.warn("⚠️ Weekly data error:", weeklyError)
      }

      // Fetch price history using the new simplified function
      const { data: historyData, error: historyError } = await supabase.rpc("get_price_history", {
        days_back: 30,
      })

      if (historyError) {
        console.error("❌ Price history error:", historyError)
        throw new Error(`Failed to fetch price history: ${historyError.message}`)
      }

      console.log("📈 Price history fetched:", historyData?.length || 0, "records")

      // Process history data with NaN protection
      const processedHistory = (historyData || []).map((item: any) => ({
        date: item.date,
        price: Number(item.price) || 108.2,
        j200_growth: Number(item.j200_growth) || 0,
        price_change: Number(item.price_change) || 0,
        created_at: item.created_at,
      }))

      // Calculate price change and percentage
      let priceChange = 0
      let priceChangePercentage = 0
      let j200Growth = 0

      if (latestWeeklyData) {
        priceChange = Number(latestWeeklyData.price_change) || 0
        j200Growth = Number(latestWeeklyData.j200_growth) || 0

        // Calculate percentage change
        const basePrice = safeCurrentPrice - priceChange
        if (basePrice > 0) {
          priceChangePercentage = (priceChange / basePrice) * 100
        }
      }

      // Additional NaN protection
      if (isNaN(priceChange)) priceChange = 0
      if (isNaN(priceChangePercentage)) priceChangePercentage = 0
      if (isNaN(j200Growth)) j200Growth = 0

      setPriceData({
        currentPrice: safeCurrentPrice,
        priceChange,
        priceChangePercentage,
        j200Growth,
        lastUpdated: latestWeeklyData?.created_at ? new Date(latestWeeklyData.created_at) : null,
      })

      setPriceHistory(processedHistory)

      console.log("✅ Simplified price data updated:", {
        currentPrice: safeCurrentPrice,
        priceChange,
        priceChangePercentage,
        j200Growth,
        historyCount: processedHistory.length,
      })
    } catch (err: any) {
      console.error("❌ Error fetching simplified price data:", err)
      setError(err.message || "Failed to fetch price data")

      // Set fallback data on error
      setPriceData({
        currentPrice: 108.2,
        priceChange: 0,
        priceChangePercentage: 0,
        j200Growth: 0,
        lastUpdated: null,
      })
      setPriceHistory([])
    } finally {
      setLoading(false)
    }
  }

  // Load price data on mount
  useEffect(() => {
    refreshPriceData()
  }, [])

  // Set up real-time subscription for price updates
  useEffect(() => {
    console.log("🔔 Setting up simplified price real-time subscription")

    const priceSubscription = supabase
      .channel("weekly_prices_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "weekly_prices",
        },
        (payload) => {
          console.log("📡 Price change detected:", payload)
          refreshPriceData()
        },
      )
      .subscribe()

    return () => {
      console.log("🔕 Cleaning up price subscription")
      priceSubscription.unsubscribe()
    }
  }, [])

  const value = {
    priceData,
    priceHistory,
    loading,
    error,
    refreshPriceData,
  }

  return <PriceContext.Provider value={value}>{children}</PriceContext.Provider>
}

export function usePrice() {
  const context = useContext(PriceContext)
  if (context === undefined) {
    throw new Error("usePrice must be used within a PriceProvider")
  }
  return context
}
