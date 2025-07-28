"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase-singleton"

type PriceData = {
  currentPrice: number
  previousPrice: number
  priceChange: number
  percentageChange: number
  j200Growth: number
  effectiveDate: string
  lastUpdated: string
}

type PriceContextType = {
  priceData: PriceData
  loading: boolean
  error: string | null
  refreshPrice: () => Promise<void>
  triggerPriceCalculation: () => Promise<{ success: boolean; message: string }>
}

const PriceContext = createContext<PriceContextType | undefined>(undefined)

const DEFAULT_PRICE_DATA: PriceData = {
  currentPrice: 100.0,
  previousPrice: 100.0,
  priceChange: 0,
  percentageChange: 0,
  j200Growth: 0,
  effectiveDate: new Date().toISOString().split("T")[0],
  lastUpdated: new Date().toISOString(),
}

export function PriceProvider({ children }: { children: React.ReactNode }) {
  const [priceData, setPriceData] = useState<PriceData>(DEFAULT_PRICE_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPriceData = useCallback(async () => {
    try {
      setError(null)

      // Get current price
      const { data: currentPriceData, error: currentPriceError } = await supabase.rpc("get_current_share_price")

      if (currentPriceError) {
        throw new Error(`Failed to fetch current price: ${currentPriceError.message}`)
      }

      // Get price history (last 2 records to calculate change)
      const { data: historyData, error: historyError } = await supabase.rpc("get_price_history", { limit_count: 2 })

      if (historyError) {
        throw new Error(`Failed to fetch price history: ${historyError.message}`)
      }

      const currentPrice = Number(currentPriceData) || 100.0
      let previousPrice = 100.0
      let priceChange = 0
      let percentageChange = 0
      let j200Growth = 0
      let effectiveDate = new Date().toISOString().split("T")[0]
      let lastUpdated = new Date().toISOString()

      if (historyData && historyData.length > 0) {
        const latest = historyData[0]
        const previous = historyData[1]

        previousPrice = previous ? Number(previous.final_price) : Number(latest.base_price)
        priceChange = Number(latest.price_change) || 0
        percentageChange = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0
        j200Growth = Number(latest.j200_growth) || 0
        effectiveDate = latest.effective_date
        lastUpdated = latest.created_at
      }

      const newPriceData: PriceData = {
        currentPrice,
        previousPrice,
        priceChange,
        percentageChange,
        j200Growth,
        effectiveDate,
        lastUpdated,
      }

      setPriceData(newPriceData)
      console.log("[PriceContext] Price data updated:", newPriceData)
    } catch (err: any) {
      console.error("[PriceContext] Error fetching price data:", err)
      setError(err.message || "Failed to fetch price data")
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshPrice = useCallback(async () => {
    await fetchPriceData()
  }, [fetchPriceData])

  const triggerPriceCalculation = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("trigger_weekly_price_calculation")

      if (error) {
        throw new Error(error.message)
      }

      // Refresh price data after calculation
      await fetchPriceData()

      return {
        success: data?.[0]?.success || false,
        message: data?.[0]?.message || "Price calculation completed",
      }
    } catch (err: any) {
      console.error("[PriceContext] Error triggering price calculation:", err)
      return {
        success: false,
        message: err.message || "Failed to trigger price calculation",
      }
    }
  }, [fetchPriceData])

  // Initial load and setup realtime subscription
  useEffect(() => {
    fetchPriceData()

    // Set up realtime subscription for price changes
    const channel = supabase
      .channel("price-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "weekly_prices",
        },
        () => {
          console.log("[PriceContext] Price change detected, refreshing...")
          fetchPriceData()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchPriceData])

  const value: PriceContextType = {
    priceData,
    loading,
    error,
    refreshPrice,
    triggerPriceCalculation,
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
