"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import { v4 as uuidv4 } from "uuid"

type MarketOrder = {
  id: string
  total_amount?: number
  shares_remaining?: number
  shares_available?: number
  price_per_share: number
  amount_filled?: number
  status: string
  created_at: string
}

type UserOrder = MarketOrder & {
  user_uuid: string
}

type ExchangeStatus = {
  is_trading_open: boolean
  status_message: string
  current_price: number
  current_week_start: string
  last_price_update: string
  last_updated: string
}

type ExchangeContextType = {
  marketSellOrders: MarketOrder[]
  marketBuyOrders: MarketOrder[]
  userSellOrders: UserOrder[]
  userBuyOrders: UserOrder[]
  currentSharePrice: number
  exchangeStatus: ExchangeStatus | null
  loading: boolean
  error: string | null
  placeBuyOrder: (amount: number) => Promise<{ success: boolean; message: string }>
  placeSellOrder: (shares: number) => Promise<{ success: boolean; message: string }>
  refreshOrders: () => Promise<void>
  refreshExchangeStatus: () => Promise<void>
}

const ExchangeContext = createContext<ExchangeContextType | undefined>(undefined)

export function ExchangeProvider({ children }: { children: React.ReactNode }) {
  const [marketSellOrders, setMarketSellOrders] = useState<MarketOrder[]>([])
  const [marketBuyOrders, setMarketBuyOrders] = useState<MarketOrder[]>([])
  const [userSellOrders, setUserSellOrders] = useState<UserOrder[]>([])
  const [userBuyOrders, setUserBuyOrders] = useState<UserOrder[]>([])
  const [currentSharePrice, setCurrentSharePrice] = useState<number>(108.2)
  const [exchangeStatus, setExchangeStatus] = useState<ExchangeStatus | null>(null)
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

  // Fetch exchange status
  const fetchExchangeStatus = async () => {
    try {
      const { data, error } = await supabase.rpc("get_exchange_status")
      if (error) throw error

      setExchangeStatus(data)
      console.log("Exchange status fetched:", data)
    } catch (err) {
      console.error("Error fetching exchange status:", err)
      setExchangeStatus({
        is_trading_open: false,
        status_message: "Exchange status unavailable",
        current_price: 108.2,
        current_week_start: new Date().toISOString(),
        last_price_update: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      })
    }
  }

  // Fetch market orders - ONLY ACTIVE ORDERS (not fully filled/matched)
  const fetchMarketOrders = async () => {
    try {
      // Fetch market sell orders - ONLY available and partial (NOT matched, completed, expired, cancelled)
      const { data: sellOrders, error: sellError } = await supabase
        .from("sell_orders")
        .select("*")
        .in("status", ["available", "partial"]) // Only active sell orders
        .gt("shares_remaining", 0) // Ensure shares_remaining is not 0 or null
        .not("shares_remaining", "is", null) // Exclude null shares_remaining
        .order("created_at", { ascending: false })
        .limit(20)

      if (sellError) throw sellError

      // Filter out any orders with NaN or invalid data
      const validSellOrders = (sellOrders || []).filter((order) => {
        const sharesRemaining = Number(order.shares_remaining)
        const sharesAvailable = Number(order.shares_available)
        const pricePerShare = Number(order.price_per_share)

        return (
          !isNaN(sharesRemaining) &&
          !isNaN(sharesAvailable) &&
          !isNaN(pricePerShare) &&
          sharesRemaining > 0 &&
          sharesAvailable > 0 &&
          pricePerShare > 0
        )
      })

      // Fetch market buy orders - ONLY pending and partial (NOT filled, completed, cancelled)
      const { data: buyOrders, error: buyError } = await supabase
        .from("buy_orders")
        .select("*")
        .in("status", ["pending", "partial"]) // Only active buy orders
        .gt("total_amount", 0) // Ensure total_amount is not 0 or null
        .not("total_amount", "is", null) // Exclude null amounts
        .order("created_at", { ascending: false })
        .limit(20)

      if (buyError) throw buyError

      // Filter out any orders with NaN or invalid data
      const validBuyOrders = (buyOrders || []).filter((order) => {
        const totalAmount = Number(order.total_amount)
        const amountFilled = Number(order.amount_filled) || 0
        const pricePerShare = Number(order.price_per_share)

        return (
          !isNaN(totalAmount) &&
          !isNaN(amountFilled) &&
          !isNaN(pricePerShare) &&
          totalAmount > 0 &&
          pricePerShare > 0 &&
          amountFilled < totalAmount // Not fully filled
        )
      })

      setMarketSellOrders(validSellOrders)
      setMarketBuyOrders(validBuyOrders)

      console.log("Market orders fetched (ACTIVE ONLY):", {
        sellOrders: validSellOrders.length,
        buyOrders: validBuyOrders.length,
      })
    } catch (err) {
      console.error("Error fetching market orders:", err)
      setMarketSellOrders([])
      setMarketBuyOrders([])
    }
  }

  // Fetch user orders - ALL STATUSES (user sees their complete history)
  const fetchUserOrders = async () => {
    if (!user) return

    try {
      // Fetch user sell orders - ALL STATUSES for user history
      const { data: userSells, error: sellError } = await supabase
        .from("sell_orders")
        .select("*")
        .eq("user_uuid", user.id)
        .order("created_at", { ascending: false })

      if (sellError) throw sellError

      // Filter out invalid data but keep all statuses
      const validUserSells = (userSells || []).filter((order) => {
        const sharesAvailable = Number(order.shares_available)
        const pricePerShare = Number(order.price_per_share)

        return !isNaN(sharesAvailable) && !isNaN(pricePerShare) && sharesAvailable > 0 && pricePerShare > 0
      })

      // Fetch user buy orders - ALL STATUSES for user history
      const { data: userBuys, error: buyError } = await supabase
        .from("buy_orders")
        .select("*")
        .eq("user_uuid", user.id)
        .order("created_at", { ascending: false })

      if (buyError) throw buyError

      // Filter out invalid data but keep all statuses
      const validUserBuys = (userBuys || []).filter((order) => {
        const totalAmount = Number(order.total_amount)
        const pricePerShare = Number(order.price_per_share)

        return !isNaN(totalAmount) && !isNaN(pricePerShare) && totalAmount > 0 && pricePerShare > 0
      })

      setUserSellOrders(validUserSells)
      setUserBuyOrders(validUserBuys)

      console.log("User orders fetched (ALL STATUSES):", {
        sellOrders: validUserSells.length,
        buyOrders: validUserBuys.length,
      })
    } catch (err) {
      console.error("Error fetching user orders:", err)
      setUserSellOrders([])
      setUserBuyOrders([])
    }
  }

  // Refresh all orders, price, and exchange status
  const refreshOrders = async () => {
    setLoading(true)
    setError(null)

    try {
      await Promise.all([fetchCurrentPrice(), fetchExchangeStatus(), fetchMarketOrders(), fetchUserOrders()])
    } catch (err: any) {
      console.error("Error refreshing orders:", err)
      setError(err.message || "Failed to refresh orders")
    } finally {
      setLoading(false)
    }
  }

  // Add separate refresh function for exchange status
  const refreshExchangeStatus = async () => {
    await fetchExchangeStatus()
  }

  // Place buy order - check if exchange is open
  const placeBuyOrder = async (amount: number): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: "User not authenticated" }
    }

    // Check if exchange is open
    if (!exchangeStatus?.is_trading_open) {
      return { success: false, message: "Exchange is currently closed. Trading resumes Monday at 09:25." }
    }

    const safeAmount = isNaN(amount) ? 0 : amount
    if (safeAmount <= 0) {
      return { success: false, message: "Invalid amount" }
    }

    // 1. Optimistic UI Update
    const tempId = uuidv4()
    const optimisticOrder: UserOrder = {
      id: tempId,
      user_uuid: user.id,
      total_amount: safeAmount,
      price_per_share: currentSharePrice,
      status: "pending",
      created_at: new Date().toISOString(),
      amount_filled: 0,
    }
    setUserBuyOrders((prev) => [optimisticOrder, ...prev])

    try {
      // 2. Call Supabase
      const { data, error } = await supabase.rpc("place_buy_order", {
        p_user_uuid: user.id,
        p_total_amount: safeAmount,
      })

      if (error) throw error

      if (data?.success) {
        // 3. On success, refresh to get real data
        await refreshOrders()
        return { success: true, message: data.message || "Buy order placed successfully" }
      } else {
        throw new Error(data?.message || "Failed to place buy order")
      }
    } catch (err: any) {
      // 4. On failure, revert the optimistic update
      setUserBuyOrders((prev) => prev.filter((order) => order.id !== tempId))
      console.error("Error placing buy order:", err)
      return { success: false, message: err.message || "Failed to place buy order" }
    }
  }

  // Place sell order - check if exchange is open
  const placeSellOrder = async (shares: number): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: "User not authenticated" }
    }

    // Check if exchange is open
    if (!exchangeStatus?.is_trading_open) {
      return { success: false, message: "Exchange is currently closed. Trading resumes Monday at 09:25." }
    }

    const safeShares = isNaN(shares) ? 0 : shares
    if (safeShares <= 0) {
      return { success: false, message: "Invalid number of shares" }
    }

    // 1. Optimistic UI Update
    const tempId = uuidv4()
    const optimisticOrder: UserOrder = {
      id: tempId,
      user_uuid: user.id,
      shares_available: safeShares,
      shares_remaining: safeShares,
      price_per_share: currentSharePrice,
      status: "available",
      created_at: new Date().toISOString(),
    }
    setUserSellOrders((prev) => [optimisticOrder, ...prev])

    try {
      // 2. Call Supabase
      const { data, error } = await supabase.rpc("place_sell_order", {
        p_user_uuid: user.id,
        p_shares: safeShares,
      })

      if (error) throw error

      if (data?.success) {
        // 3. On success, refresh to get real data
        await refreshOrders()
        return { success: true, message: data.message || "Sell order placed successfully" }
      } else {
        throw new Error(data?.message || "Failed to place sell order")
      }
    } catch (err: any) {
      // 4. On failure, revert the optimistic update
      setUserSellOrders((prev) => prev.filter((order) => order.id !== tempId))
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
    exchangeStatus,
    loading,
    error,
    placeBuyOrder,
    placeSellOrder,
    refreshOrders,
    refreshExchangeStatus,
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
