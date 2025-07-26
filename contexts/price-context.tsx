"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-singleton"

interface PriceData {
  currentPrice: number
  priceChange: number
  priceChangePercent: number
  lastUpdated: string
}

interface PriceHistory {
  effective_date: string
  base_price: number
  j200_growth: number
  final_price: number
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
    priceChangePercent: 0,
    lastUpdated: new Date().toISOString(),
  })
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshPriceData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Refreshing price data...")

      // Fetch current price with NaN protection
      const { data: currentPriceData, error: priceError } = await supabase.rpc("get_current_share_price")

      if (priceError) {
        console.error("Price error:", priceError)
        throw new Error(`Failed to fetch current price: ${priceError.message}`)
      }

      // Ensure price is a valid number
      const currentPrice = Number(currentPriceData) || 108.2
      const safeCurrentPrice = isNaN(currentPrice) ? 108.2 : currentPrice

      console.log("📊 Current price fetched:", safeCurrentPrice)

      // Fetch price history with NaN protection
      const { data: historyData, error: historyError } = await supabase.rpc("get_price_history", {
        days_back: 30,
      })

      if (historyError) {
        console.error("Price history error:", historyError)
        throw new Error(`Failed to fetch price history: ${historyError.message}`)
      }

      console.log("📈 Price history fetched:", historyData?.length || 0, "records")

      // Process history data with NaN protection
      const processedHistory = (historyData || []).map((item: any) => ({
        effective_date: item.effective_date,
        base_price: Number(item.base_price) || 108.2,
        j200_growth: Number(item.j200_growth) || 0,
        final_price: Number(item.final_price) || 108.2,
        price_change: Number(item.price_change) || 0,
        created_at: item.created_at,
      }))

      // Calculate price change from history
      let priceChange = 0
      let priceChangePercent = 0

      if (processedHistory.length >= 2) {
        const previousPrice = processedHistory[1].final_price
        priceChange = safeCurrentPrice - previousPrice
        priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0

        // Additional NaN protection
        if (isNaN(priceChange)) priceChange = 0
        if (isNaN(priceChangePercent)) priceChangePercent = 0
      }

      setPriceData({
        currentPrice: safeCurrentPrice,
        priceChange,
        priceChangePercent,
        lastUpdated: new Date().toISOString(),
      })

      setPriceHistory(processedHistory)

      console.log("✅ Price data updated:", {
        currentPrice: safeCurrentPrice,
        priceChange,
        priceChangePercent,
        historyCount: processedHistory.length,
      })
    } catch (err: any) {
      console.error("❌ Error fetching price data:", err)
      setError(err.message || "Failed to fetch price data")

      // Set fallback data on error
      setPriceData({
        currentPrice: 108.2,
        priceChange: 0,
        priceChangePercent: 0,
        lastUpdated: new Date().toISOString(),
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
    console.log("🔔 Setting up price real-time subscription")

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
