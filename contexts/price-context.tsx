"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

type PriceData = {
  currentPrice: number
  priceChange: number
  lastUpdated: Date | null
}

type PriceHistory = {
  date: string
  price: number
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
      console.log("Refreshing price data...")

      // Get latest share price
      const { data: currentPrice, error: priceError } = await supabase.rpc("get_latest_share_price")
      if (priceError) {
        console.error("Price fetch error:", priceError)
        throw priceError
      }

      // Get latest weekly price data for change calculation
      const { data: weeklyData, error: weeklyError } = await supabase
        .from("weekly_prices")
        .select("final_price, price_change, created_at")
        .order("effective_date", { ascending: false })
        .limit(1)
        .single()

      if (weeklyError && weeklyError.code !== "PGRST116") {
        console.error("Weekly data error:", weeklyError)
        // Don't throw here, just log the error
      }

      const newPriceData = {
        currentPrice: Number(currentPrice) || 108.2,
        priceChange: Number(weeklyData?.price_change) || 0,
        lastUpdated: weeklyData?.created_at ? new Date(weeklyData.created_at) : null,
      }

      setPriceData(newPriceData)

      console.log("Price data refreshed successfully:", newPriceData)
    } catch (err: any) {
      console.error("Error fetching price data:", err)
      setError(err.message || "Failed to fetch price data")

      // Set fallback data on error
      setPriceData({
        currentPrice: 108.2,
        priceChange: 0,
        lastUpdated: null,
      })
    }
  }

  // Fetch price history
  const refreshHistory = async (days = 30) => {
    try {
      setError(null)
      console.log(`Refreshing price history for ${days} days...`)

      const { data, error } = await supabase.rpc("get_price_history", { days_back: days })
      if (error) {
        console.error("Price history error:", error)
        throw error
      }

      const formattedHistory: PriceHistory[] = (data || []).map((item: any) => ({
        date: item.date,
        price: Number(item.price),
        j200Growth: Number(item.j200_growth),
        priceChange: Number(item.price_change),
      }))

      setPriceHistory(formattedHistory)
      console.log("Price history refreshed successfully:", formattedHistory.length, "records")
    } catch (err: any) {
      console.error("Error fetching price history:", err)
      setError(err.message || "Failed to fetch price history")

      // Set empty array on error
      setPriceHistory([])
    }
  }

  // Load data on mount and when user changes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([refreshPrice().catch(console.error), refreshHistory().catch(console.error)])
      setLoading(false)
    }

    loadData()
  }, [user])

  // Set up real-time subscription for price updates
  useEffect(() => {
    if (!user) return

    console.log("Setting up real-time price subscription...")

    const subscription = supabase
      .channel("price_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "weekly_prices",
        },
        (payload) => {
          console.log("Price update detected:", payload)
          refreshPrice().catch(console.error)
        },
      )
      .subscribe()

    return () => {
      console.log("Unsubscribing from price updates...")
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
