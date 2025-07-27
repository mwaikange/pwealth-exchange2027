"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

type PriceData = {
  currentPrice: number
  priceChange: number
  hodlPercentage: number
  lastUpdated: Date | null
}

type PriceHistory = {
  date: string
  price: number
  hodlPercentage: number
  j200Growth: number
  priceChange: number
}

type PriceContextType = {
  priceData: PriceData
  priceHistory: PriceHistory[]
  loading: boolean
  error: string | null
  refreshPrice: () => Promise<void>
  refreshHistory: (days?: number) => Promise<void>
}

const PriceContext = createContext<PriceContextType | undefined>(undefined)

export function PriceProvider({ children }: { children: React.ReactNode }) {
  const [priceData, setPriceData] = useState<PriceData>({
    currentPrice: 108.2,
    priceChange: 0,
    hodlPercentage: 75.0,
    lastUpdated: null,
  })
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Fetch current price data
  const refreshPrice = async () => {
    try {
      setError(null)

      // Get latest share price - try multiple approaches
      let currentPrice = 108.2
      try {
        const { data: priceData, error: priceError } = await supabase.rpc("get_latest_share_price")
        if (!priceError && priceData !== null) {
          currentPrice = Number(priceData)
        } else {
          // Fallback: try to get from weekly_prices table directly
          const { data: weeklyPrice, error: weeklyError } = await supabase
            .from("weekly_prices")
            .select("final_price")
            .order("effective_date", { ascending: false })
            .limit(1)
            .single()

          if (!weeklyError && weeklyPrice) {
            currentPrice = Number(weeklyPrice.final_price)
          }
        }
      } catch (err) {
        console.warn("Error fetching current price, using fallback:", err)
      }

      // Get current HODL percentage
      let hodlPct = 75.0
      try {
        const { data: hodlData, error: hodlError } = await supabase.rpc("get_current_hodl_percentage")
        if (!hodlError && hodlData !== null) {
          hodlPct = Number(hodlData)
        } else {
          // Fallback: try to get from daily_hodl_metrics table directly
          const { data: hodlMetric, error: hodlMetricError } = await supabase
            .from("daily_hodl_metrics")
            .select("hodl_percentage")
            .order("metric_date", { ascending: false })
            .limit(1)
            .single()

          if (!hodlMetricError && hodlMetric) {
            hodlPct = Number(hodlMetric.hodl_percentage)
          }
        }
      } catch (err) {
        console.warn("Error fetching HODL percentage, using fallback:", err)
      }

      // Get latest weekly price data for change calculation
      let priceChange = 0
      let lastUpdated = null
      try {
        const { data: weeklyData, error: weeklyError } = await supabase
          .from("weekly_prices")
          .select("final_price, price_change, created_at")
          .order("effective_date", { ascending: false })
          .limit(1)
          .single()

        if (!weeklyError && weeklyData) {
          priceChange = Number(weeklyData.price_change) || 0
          lastUpdated = weeklyData.created_at ? new Date(weeklyData.created_at) : null
        }
      } catch (err) {
        console.warn("Error fetching price change, using fallback:", err)
      }

      setPriceData({
        currentPrice,
        priceChange,
        hodlPercentage: hodlPct,
        lastUpdated,
      })

      console.log("Price data refreshed:", {
        currentPrice,
        hodlPct,
        priceChange,
      })
    } catch (err: any) {
      console.error("Error fetching price data:", err)
      setError(err.message || "Failed to fetch price data")

      // Set fallback data even on error
      setPriceData({
        currentPrice: 108.2,
        priceChange: 0,
        hodlPercentage: 75.0,
        lastUpdated: null,
      })
    }
  }

  // Fetch price history
  const refreshHistory = async (days = 30) => {
    try {
      setError(null)

      let formattedHistory: PriceHistory[] = []

      try {
        const { data, error } = await supabase.rpc("get_price_history", { days_back: days })
        if (!error && data) {
          formattedHistory = (data || []).map((item: any) => ({
            date: item.date,
            price: Number(item.price),
            hodlPercentage: Number(item.hodl_percentage),
            j200Growth: Number(item.j200_growth),
            priceChange: Number(item.price_change),
          }))
        } else {
          // Fallback: get data directly from weekly_prices table
          const { data: weeklyData, error: weeklyError } = await supabase
            .from("weekly_prices")
            .select("effective_date, final_price, hodl_percentage, j200_growth, price_change")
            .gte("effective_date", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
            .order("effective_date", { ascending: false })

          if (!weeklyError && weeklyData) {
            formattedHistory = weeklyData.map((item: any) => ({
              date: item.effective_date,
              price: Number(item.final_price),
              hodlPercentage: Number(item.hodl_percentage),
              j200Growth: Number(item.j200_growth),
              priceChange: Number(item.price_change),
            }))
          }
        }
      } catch (err) {
        console.warn("Error fetching price history, using empty array:", err)
      }

      setPriceHistory(formattedHistory)
      console.log("Price history refreshed:", formattedHistory.length, "records")
    } catch (err: any) {
      console.error("Error fetching price history:", err)
      setError(err.message || "Failed to fetch price history")
      setPriceHistory([])
    }
  }

  // Load data on mount and when user changes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([refreshPrice(), refreshHistory()])
      setLoading(false)
    }

    loadData()
  }, [user])

  // Set up real-time subscription for price updates
  useEffect(() => {
    if (!user) return

    const subscription = supabase
      .channel("price_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "weekly_prices",
        },
        () => {
          console.log("Price update detected, refreshing...")
          refreshPrice()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  const value = {
    priceData,
    priceHistory,
    loading,
    error,
    refreshPrice,
    refreshHistory,
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
