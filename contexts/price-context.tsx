"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase-singleton"

type PriceData = {
  currentPrice: number
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
  triggerPriceCalculation: () => Promise<any>
}

const PriceContext = createContext<PriceContextType | undefined>(undefined)

const DEFAULT_PRICE_DATA: PriceData = {
  currentPrice: 100.0,
  priceChange: 0,
  percentageChange: 0,
  j200Growth: 0,
  effectiveDate: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
}

export function PriceProvider({ children }: { children: React.ReactNode }) {
  const [priceData, setPriceData] = useState<PriceData>(DEFAULT_PRICE_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPriceData = useCallback(async () => {
    try {
      setError(null)

      // Get current share price
      const { data: currentPrice, error: priceError } = await supabase.rpc("get_current_share_price")

      if (priceError) {
        throw new Error(`Failed to fetch current price: ${priceError.message}`)
      }

      // Get latest price history for additional data
      const { data: priceHistory, error: historyError } = await supabase.rpc("get_price_history", { limit_count: 2 })

      if (historyError) {
        throw new Error(`Failed to fetch price history: ${historyError.message}`)
      }

      if (priceHistory && priceHistory.length > 0) {
        const latest = priceHistory[0]
        const previous = priceHistory[1]

        // Calculate percentage change from previous week
        let percentageChange = 0
        if (previous && previous.final_price > 0) {
          percentageChange = ((latest.final_price - previous.final_price) / previous.final_price) * 100
        }

        setPriceData({
          currentPrice: Number(currentPrice) || 100.0,
          priceChange: Number(latest.price_change) || 0,
          percentageChange: percentageChange,
          j200Growth: Number(latest.j200_growth) || 0,
          effectiveDate: latest.effective_date,
          lastUpdated: latest.created_at,
        })
      } else {
        // Fallback to current price only
        setPriceData({
          ...DEFAULT_PRICE_DATA,
          currentPrice: Number(currentPrice) || 100.0,
        })
      }
    } catch (err: any) {
      console.error("Error fetching price data:", err)
      setError(err.message || "Failed to fetch price data")
      // Keep existing data on error, don't reset to default
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
        throw new Error(`Price calculation failed: ${error.message}`)
      }

      // Refresh price data after calculation
      await fetchPriceData()

      return data
    } catch (err: any) {
      console.error("Error triggering price calculation:", err)
      throw err
    }
  }, [fetchPriceData])

  // Initial load
  useEffect(() => {
    fetchPriceData()
  }, [fetchPriceData])

  // Set up polling for price updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPriceData()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchPriceData])

  const value = {
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
