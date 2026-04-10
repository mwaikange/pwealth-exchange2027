"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import { v4 as uuidv4 } from "uuid"

type MarketOrder = {
  id: string
  total_amount?: number
  shares_available?: number
  shares_remaining?: number
  shares_requested?: number // Buy orders have this
  shares_filled?: number // Buy orders have this
  amount_filled?: number // Buy orders have this
  price_per_share: number
  status: string
  created_at: string
  buy_ref?: string // Buy orders
  sell_ref?: string // Sell orders
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
  windhoek_time?: string
  trading_schedule?: {
    weekly_close: string
    history_clear: string
    price_calculation: string
    weekly_open: string
    timezone: string
  }
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
  const [currentSharePrice, setCurrentSharePrice] = useState<number>(99.68)
  const [exchangeStatus, setExchangeStatus] = useState<ExchangeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Fetch current share price with NaN protection
  const fetchCurrentPrice = async () => {
    try {
      const { data, error } = await supabase.rpc("get_current_share_price")
      if (error) throw error

      const price = Number(data) || 99.68
      const safePrice = isNaN(price) ? 99.68 : price
      setCurrentSharePrice(safePrice)

      console.log("Current share price fetched:", safePrice)
    } catch (err) {
      console.error("Error fetching current price:", err)
      setCurrentSharePrice(99.68)
    }
  }

  // Fetch exchange status
  const fetchExchangeStatus = async () => {
    try {
      const { data, error } = await supabase.rpc("get_exchange_status")
      if (error) throw error

      const mappedStatus: ExchangeStatus = {
        is_trading_open: data.is_trading_open || false,
        status_message: data.status_message || "Exchange status unavailable",
        current_price: currentSharePrice,
        current_week_start: data.current_week_start || new Date().toISOString(),
        last_price_update: data.last_price_update || new Date().toISOString(),
        last_updated: data.windhoek_time || new Date().toISOString(),
        windhoek_time: data.windhoek_time,
        trading_schedule: data.trading_schedule || {
          weekly_close: "Sunday 23:59",
          history_clear: "Monday 09:30",
          price_calculation: "Monday 10:03",
          weekly_open: "Monday 10:05",
          timezone: "Africa/Windhoek (UTC+2)",
        },
      }

      setExchangeStatus(mappedStatus)
      console.log("Exchange status fetched:", mappedStatus)
    } catch (err) {
      console.error("Error fetching exchange status:", err)
      setExchangeStatus({
        is_trading_open: false,
        status_message: "Exchange status unavailable",
        current_price: 99.68,
        current_week_start: new Date().toISOString(),
        last_price_update: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        trading_schedule: {
          weekly_close: "Sunday 23:59",
          history_clear: "Monday 09:30",
          price_calculation: "Monday 10:03",
          weekly_open: "Monday 10:05",
          timezone: "Africa/Windhoek (UTC+2)",
        },
      })
    }
  }

  // Fetch market orders with CORRECT enum values and column names
  const fetchMarketOrders = async () => {
    try {
      // Fetch market sell orders - CORRECT enum values: "available" and "partial"
      const { data: sellOrders, error: sellError } = await supabase
        .from("sell_orders")
        .select("*")
        .in("status", ["available", "partial"]) // CORRECT enum values
        .gt("shares_remaining", 0)
        .not("shares_remaining", "is", null)
        .order("created_at", { ascending: false })
        .limit(20)

      if (sellError) throw sellError

      // Filter valid sell orders using CORRECT column names
      const validSellOrders = (sellOrders || []).filter((order) => {
        const sharesRemaining = Number(order.shares_remaining)
        const sharesAvailable = Number(order.shares_available) // CORRECT column name
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

      // Fetch market buy orders - CORRECT enum values: "pending" and "partial"
      const { data: buyOrders, error: buyError } = await supabase
        .from("buy_orders")
        .select("*")
        .in("status", ["pending", "partial"]) // CORRECT enum values
        .gt("total_amount", 0)
        .not("total_amount", "is", null)
        .order("created_at", { ascending: false })
        .limit(20)

      if (buyError) throw buyError

      // Filter valid buy orders using ACTUAL schema columns
      const validBuyOrders = (buyOrders || []).filter((order) => {
        const totalAmount = Number(order.total_amount)
        const amountFilled = Number(order.amount_filled) || 0
        const sharesRequested = Number(order.shares_requested) || 0
        const pricePerShare = Number(order.price_per_share)

        return (
          !isNaN(totalAmount) &&
          !isNaN(amountFilled) &&
          !isNaN(sharesRequested) &&
          !isNaN(pricePerShare) &&
          totalAmount > 0 &&
          sharesRequested > 0 &&
          pricePerShare > 0 &&
          amountFilled < totalAmount
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

  // Fetch user orders - ALL STATUSES for user history
  const fetchUserOrders = async () => {
    if (!user) return

    try {
      // Fetch user sell orders - ALL STATUSES
      const { data: userSells, error: sellError } = await supabase
        .from("sell_orders")
        .select("*")
        .eq("user_uuid", user.id)
        .order("created_at", { ascending: false })

      if (sellError) throw sellError

      // Filter valid user sells using CORRECT column names
      const validUserSells = (userSells || []).filter((order) => {
        const sharesAvailable = Number(order.shares_available) // CORRECT column name
        const pricePerShare = Number(order.price_per_share)

        return !isNaN(sharesAvailable) && !isNaN(pricePerShare) && sharesAvailable > 0 && pricePerShare > 0
      })

      // Fetch user buy orders - ALL STATUSES
      const { data: userBuys, error: buyError } = await supabase
        .from("buy_orders")
        .select("*")
        .eq("user_uuid", user.id)
        .order("created_at", { ascending: false })

      if (buyError) throw buyError

      // Filter valid user buys using ACTUAL schema columns
      const validUserBuys = (userBuys || []).filter((order) => {
        const totalAmount = Number(order.total_amount)
        const sharesRequested = Number(order.shares_requested) || 0
        const pricePerShare = Number(order.price_per_share)

        return (
          !isNaN(totalAmount) &&
          !isNaN(sharesRequested) &&
          !isNaN(pricePerShare) &&
          totalAmount > 0 &&
          sharesRequested > 0 &&
          pricePerShare > 0
        )
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

  // Refresh all data
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

  const refreshExchangeStatus = async () => {
    await fetchExchangeStatus()
  }

  // Place buy order with CORRECT function call
  const placeBuyOrder = async (amount: number): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: "User not authenticated" }
    }

    if (!exchangeStatus?.is_trading_open) {
      const schedule = exchangeStatus?.trading_schedule
      return {
        success: false,
        message: `Exchange is currently closed. Trading resumes Monday at ${schedule?.weekly_open || "10:05"} (${schedule?.timezone || "Windhoek time"}).`,
      }
    }

    const safeAmount = isNaN(amount) ? 0 : amount
    if (safeAmount <= 0) {
      return { success: false, message: "Invalid amount" }
    }

    // Optimistic UI update with ACTUAL schema fields
    const tempId = uuidv4()
    const estimatedShares = safeAmount / currentSharePrice
    const optimisticOrder: UserOrder = {
      id: tempId,
      user_uuid: user.id,
      total_amount: safeAmount,
      shares_requested: estimatedShares, // ACTUAL column
      shares_filled: 0, // ACTUAL column
      amount_filled: 0, // ACTUAL column
      price_per_share: currentSharePrice,
      status: "pending", // CORRECT enum value
      created_at: new Date().toISOString(),
      buy_ref: `Buy_${tempId.slice(-6)}`,
    }
    setUserBuyOrders((prev) => [optimisticOrder, ...prev])

    try {
      // Call function with CORRECT parameters
      const { data, error } = await supabase.rpc("place_buy_order", {
        p_user_uuid: user.id,
        p_total_amount: safeAmount,
      })

      if (error) throw error

      if (data?.success) {
        await refreshOrders()
        return { success: true, message: data.message || "Buy order placed successfully" }
      } else {
        throw new Error(data?.message || "Failed to place buy order")
      }
    } catch (err: any) {
      // Revert optimistic update
      setUserBuyOrders((prev) => prev.filter((order) => order.id !== tempId))
      console.error("Error placing buy order:", err)
      return { success: false, message: err.message || "Failed to place buy order" }
    }
  }

  // Place sell order - REVERTED: Use original function name
  const placeSellOrder = async (shares: number): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: "User not authenticated" }
    }

    if (!exchangeStatus?.is_trading_open) {
      const schedule = exchangeStatus?.trading_schedule
      return {
        success: false,
        message: `Exchange is currently closed. Trading resumes Monday at ${schedule?.weekly_open || "10:05"} (${schedule?.timezone || "Windhoek time"}).`,
      }
    }

    const safeShares = isNaN(shares) ? 0 : shares
    if (safeShares <= 0) {
      return { success: false, message: "Invalid number of shares" }
    }

    // Optimistic UI update - calculate estimated total for display
    const tempId = uuidv4()
    const estimatedTotal = safeShares * currentSharePrice
    const optimisticOrder: UserOrder = {
      id: tempId,
      user_uuid: user.id,
      shares_available: safeShares, // CORRECT column name
      shares_remaining: safeShares,
      total_amount: estimatedTotal, // Estimated for UI (database will calculate actual)
      price_per_share: currentSharePrice,
      status: "available", // CORRECT enum value
      created_at: new Date().toISOString(),
      sell_ref: `Sell_${tempId.slice(-6)}`,
    }
    setUserSellOrders((prev) => [optimisticOrder, ...prev])

    try {
      // Call function - REVERTED: Use original function name
      const { data, error } = await supabase.rpc("place_sell_order", {
        p_user_uuid: user.id,
        p_shares: safeShares,
      })

      if (error) throw error

      if (data?.success) {
        await refreshOrders() // This will fetch the actual database-calculated total_amount
        return { success: true, message: data.message || "Sell order placed successfully" }
      } else {
        throw new Error(data?.message || "Failed to place sell order")
      }
    } catch (err: any) {
      // Revert optimistic update
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
