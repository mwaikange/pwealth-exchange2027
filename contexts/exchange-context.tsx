"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

type MarketOrder = {
  id: string
  total_amount?: number
  shares?: number
  price_per_share: number
  filled_amount?: number
  filled_shares?: number
  status: string
  created_at: string
}

type UserOrder = MarketOrder & {
  user_id: string
}

type ExchangeContextType = {
  marketSellOrders: MarketOrder[]
  marketBuyOrders: MarketOrder[]
  userSellOrders: UserOrder[]
  userBuyOrders: UserOrder[]
  currentSharePrice: number
  loading: boolean
  error: string | null
  placeBuyOrder: (amount: number) => Promise<{ success: boolean; message: string }>
  placeSellOrder: (shares: number) => Promise<{ success: boolean; message: string }>
  refreshOrders: () => Promise<void>
}

const ExchangeContext = createContext<ExchangeContextType | undefined>(undefined)

export function ExchangeProvider({ children }: { children: React.ReactNode }) {
  const [marketSellOrders, setMarketSellOrders] = useState<MarketOrder[]>([])
  const [marketBuyOrders, setMarketBuyOrders] = useState<MarketOrder[]>([])
  const [userSellOrders, setUserSellOrders] = useState<UserOrder[]>([])
  const [userBuyOrders, setUserBuyOrders] = useState<UserOrder[]>([])
  const [currentSharePrice, setCurrentSharePrice] = useState<number>(108.2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Fetch current share price with NaN protection
  const fetchCurrentPrice = async () => {
    try {
      const { data, error } = await supabase.rpc("get_current_share_price")
      if (error) throw error

      const price = Number(data) || 108.2
      // Additional NaN protection
      const safePrice = isNaN(price) ? 108.2 : price
      setCurrentSharePrice(safePrice)

      console.log("Current share price fetched:", safePrice)
    } catch (err) {
      console.error("Error fetching current price:", err)
      setCurrentSharePrice(108.2) // Fallback price
    }
  }

  // Fetch market orders
  const fetchMarketOrders = async () => {
    try {
      // Fetch market sell orders
      const { data: sellOrders, error: sellError } = await supabase
        .from("sell_orders")
        .select("*")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(20)

      if (sellError) throw sellError

      // Fetch market buy orders
      const { data: buyOrders, error: buyError } = await supabase
        .from("buy_orders")
        .select("*")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(20)

      if (buyError) throw buyError

      setMarketSellOrders(sellOrders || [])
      setMarketBuyOrders(buyOrders || [])

      console.log("Market orders fetched:", {
        sellOrders: sellOrders?.length || 0,
        buyOrders: buyOrders?.length || 0,
      })
    } catch (err) {
      console.error("Error fetching market orders:", err)
      setMarketSellOrders([])
      setMarketBuyOrders([])
    }
  }

  // Fetch user orders
  const fetchUserOrders = async () => {
    if (!user) return

    try {
      // Fetch user sell orders
      const { data: userSells, error: sellError } = await supabase
        .from("sell_orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (sellError) throw sellError

      // Fetch user buy orders
      const { data: userBuys, error: buyError } = await supabase
        .from("buy_orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (buyError) throw buyError

      setUserSellOrders(userSells || [])
      setUserBuyOrders(userBuys || [])

      console.log("User orders fetched:", {
        sellOrders: userSells?.length || 0,
        buyOrders: userBuys?.length || 0,
      })
    } catch (err) {
      console.error("Error fetching user orders:", err)
      setUserSellOrders([])
      setUserBuyOrders([])
    }
  }

  // Refresh all orders and price
  const refreshOrders = async () => {
    setLoading(true)
    setError(null)

    try {
      await Promise.all([fetchCurrentPrice(), fetchMarketOrders(), fetchUserOrders()])
    } catch (err: any) {
      console.error("Error refreshing orders:", err)
      setError(err.message || "Failed to refresh orders")
    } finally {
      setLoading(false)
    }
  }

  // Place buy order
  const placeBuyOrder = async (amount: number): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: "User not authenticated" }
    }

    try {
      // Ensure amount is not NaN
      const safeAmount = isNaN(amount) ? 0 : amount
      if (safeAmount <= 0) {
        return { success: false, message: "Invalid amount" }
      }

      const { data, error } = await supabase.rpc("place_buy_order", {
        p_user_id: user.id,
        p_total_amount: safeAmount,
      })

      if (error) throw error

      if (data?.success) {
        await refreshOrders()
        return { success: true, message: data.message || "Buy order placed successfully" }
      } else {
        return { success: false, message: data?.message || "Failed to place buy order" }
      }
    } catch (err: any) {
      console.error("Error placing buy order:", err)
      return { success: false, message: err.message || "Failed to place buy order" }
    }
  }

  // Place sell order
  const placeSellOrder = async (shares: number): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: "User not authenticated" }
    }

    try {
      // Ensure shares is not NaN
      const safeShares = isNaN(shares) ? 0 : shares
      if (safeShares <= 0) {
        return { success: false, message: "Invalid number of shares" }
      }

      const { data, error } = await supabase.rpc("place_sell_order", {
        p_user_id: user.id,
        p_shares: safeShares,
      })

      if (error) throw error

      if (data?.success) {
        await refreshOrders()
        return { success: true, message: data.message || "Sell order placed successfully" }
      } else {
        return { success: false, message: data?.message || "Failed to place sell order" }
      }
    } catch (err: any) {
      console.error("Error placing sell order:", err)
      return { success: false, message: err.message || "Failed to place sell order" }
    }
  }

  // Load data on mount and when user changes
  useEffect(() => {
    refreshOrders()
  }, [user])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return

    const sellOrdersSubscription = supabase
      .channel("sell_orders_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sell_orders",
        },
        () => {
          console.log("Sell orders updated")
          fetchMarketOrders()
          fetchUserOrders()
        },
      )
      .subscribe()

    const buyOrdersSubscription = supabase
      .channel("buy_orders_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "buy_orders",
        },
        () => {
          console.log("Buy orders updated")
          fetchMarketOrders()
          fetchUserOrders()
        },
      )
      .subscribe()

    return () => {
      sellOrdersSubscription.unsubscribe()
      buyOrdersSubscription.unsubscribe()
    }
  }, [user])

  const value = {
    marketSellOrders,
    marketBuyOrders,
    userSellOrders,
    userBuyOrders,
    currentSharePrice,
    loading,
    error,
    placeBuyOrder,
    placeSellOrder,
    refreshOrders,
  }

  return <ExchangeContext.Provider value={value}>{children}</ExchangeContext.Provider>
}

export function useExchange() {
  const context = useContext(ExchangeContext)
  if (context === undefined) {
    throw new Error("useExchange must be used within an ExchangeProvider")
  }
  return context
}
