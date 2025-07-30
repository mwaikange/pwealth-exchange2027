"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

// Helper function for consistent share formatting - FIXED: Always 4 decimal places
const formatShares = (value: number): string => {
  return Number(value).toFixed(4)
}

// Define the shape of our exchange state
type ExchangeState = {
  marketBuyOrders: any[]
  marketSellOrders: any[]
  userBuyOrders: any[]
  userSellOrders: any[]
  currentSharePrice: number
  exchangeStatus: any
}

// Define the context type with state and functions
type ExchangeContextType = ExchangeState & {
  placeBuyOrder: (amount: number) => Promise<{ success: boolean; message: string }>
  placeSellOrder: (shares: number) => Promise<{ success: boolean; message: string }>
  refreshOrders: (silent?: boolean) => Promise<void>
  loading: boolean
  error: string | null
}

// Create the context with default values
const ExchangeContext = createContext<ExchangeContextType | undefined>(undefined)

// Provider component
export function ExchangeProvider({ children }: { children: React.ReactNode }) {
  // State for exchange data
  const [exchangeState, setExchangeState] = useState<ExchangeState>({
    marketBuyOrders: [],
    marketSellOrders: [],
    userBuyOrders: [],
    userSellOrders: [],
    currentSharePrice: 99.68,
    exchangeStatus: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const { user, session } = useAuth()

  // Fetch exchange data from Supabase
  const refreshOrders = useCallback(
    async (silent = false) => {
      if (!user || !session) {
        if (!isInitialized) {
          setLoading(false)
        }
        return
      }

      try {
        if (!isInitialized && !silent) {
          setLoading(true)
        }

        if (!silent) {
          setError(null)
        }

        // Fetch all data in parallel
        const [
          marketBuyResult,
          marketSellResult,
          userBuyResult,
          userSellResult,
          sharePriceResult,
          exchangeStatusResult,
        ] = await Promise.all([
          supabase.from("buy_orders").select("*").neq("user_uuid", user.id).in("status", ["pending", "partial"]),
          supabase.from("sell_orders").select("*").neq("user_uuid", user.id).in("status", ["available", "partial"]),
          supabase.from("buy_orders").select("*").eq("user_uuid", user.id).order("created_at", { ascending: false }),
          supabase.from("sell_orders").select("*").eq("user_uuid", user.id).order("created_at", { ascending: false }),
          supabase.rpc("get_current_share_price"),
          supabase.rpc("get_exchange_status"),
        ])

        // Check for errors
        if (marketBuyResult.error) throw marketBuyResult.error
        if (marketSellResult.error) throw marketSellResult.error
        if (userBuyResult.error) throw userBuyResult.error
        if (userSellResult.error) throw userSellResult.error
        if (sharePriceResult.error) throw sharePriceResult.error
        if (exchangeStatusResult.error) throw exchangeStatusResult.error

        // Update state
        setExchangeState({
          marketBuyOrders: marketBuyResult.data || [],
          marketSellOrders: marketSellResult.data || [],
          userBuyOrders: userBuyResult.data || [],
          userSellOrders: userSellResult.data || [],
          currentSharePrice: Number(sharePriceResult.data) || 99.68,
          exchangeStatus: exchangeStatusResult.data,
        })

        if (!isInitialized) {
          setIsInitialized(true)
        }
      } catch (err: any) {
        if (!silent) {
          console.error("Error fetching exchange data:", err)
          setError(err.message || "Failed to load exchange data")
        }
      } finally {
        if (!isInitialized) {
          setLoading(false)
        }
      }
    },
    [user, session, isInitialized],
  )

  // Place buy order
  const placeBuyOrder = async (amount: number): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: "User not authenticated" }
    }

    try {
      const { data, error } = await supabase.rpc("place_buy_order", {
        p_user_uuid: user.id,
        p_total_amount: amount,
      })

      if (error) throw error

      const shares = Number(data?.shares_requested || 0)
      return {
        success: true,
        message: `Buy order placed successfully for ${formatShares(shares)} shares`, // FIXED: 4 decimal places
      }
    } catch (err: any) {
      console.error("Error placing buy order:", err)
      return {
        success: false,
        message: err.message || "Failed to place buy order",
      }
    }
  }

  // Place sell order
  const placeSellOrder = async (shares: number): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: "User not authenticated" }
    }

    try {
      const { data, error } = await supabase.rpc("place_sell_order", {
        p_user_uuid: user.id,
        p_shares_available: shares,
      })

      if (error) throw error

      return {
        success: true,
        message: `Sell order placed successfully for ${formatShares(shares)} shares`, // FIXED: 4 decimal places
      }
    } catch (err: any) {
      console.error("Error placing sell order:", err)
      return {
        success: false,
        message: err.message || "Failed to place sell order",
      }
    }
  }

  // Load data when user changes and set up polling
  useEffect(() => {
    if (!user || !session) return

    // Initial load
    refreshOrders(false)

    // Set up polling for exchange data
    const exchangeInterval = setInterval(() => {
      refreshOrders(true) // Silent background refresh
    }, 10000) // Every 10 seconds

    return () => {
      clearInterval(exchangeInterval)
    }
  }, [user, session, refreshOrders])

  // Context value
  const value = {
    ...exchangeState,
    placeBuyOrder,
    placeSellOrder,
    refreshOrders,
    loading,
    error,
  }

  return <ExchangeContext.Provider value={value}>{children}</ExchangeContext.Provider>
}

// Custom hook to use the exchange context
export function useExchange() {
  const context = useContext(ExchangeContext)
  if (context === undefined) {
    throw new Error("useExchange must be used within an ExchangeProvider")
  }
  return context
}
