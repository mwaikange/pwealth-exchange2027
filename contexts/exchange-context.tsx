"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import { useWallet } from "@/contexts/wallet-context"

export interface BuyOrder {
  id: string
  user_uuid: string
  total_amount: number
  price_per_share: number
  status: string
  filled_amount: number
  created_at: string
  expires_at?: string
}

export interface SellOrder {
  id: string
  user_uuid: string
  shares: number
  price_per_share: number
  status: string
  filled_shares: number
  created_at: string
  expires_at?: string
}

interface ExchangeContextType {
  // Market data
  marketBuyOrders: BuyOrder[]
  marketSellOrders: SellOrder[]
  userBuyOrders: BuyOrder[]
  userSellOrders: SellOrder[]

  // Actions
  placeBuyOrder: (amount: number) => Promise<void>
  placeSellOrder: (shares: number, pricePerShare: number) => Promise<void>
  refreshOrders: () => Promise<void>

  // State
  loading: boolean
  error: string | null
}

const ExchangeContext = createContext<ExchangeContextType | undefined>(undefined)

export function ExchangeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { refreshBalances } = useWallet()

  const [marketBuyOrders, setMarketBuyOrders] = useState<BuyOrder[]>([])
  const [marketSellOrders, setMarketSellOrders] = useState<SellOrder[]>([])
  const [userBuyOrders, setUserBuyOrders] = useState<BuyOrder[]>([])
  const [userSellOrders, setUserSellOrders] = useState<SellOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all orders
  const refreshOrders = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Refreshing exchange orders...")

      // Fetch market buy orders (all users, active orders)
      const { data: marketBuys, error: marketBuyError } = await supabase
        .from("buy_orders")
        .select("*")
        .in("status", ["PENDING", "PARTIAL"])
        .order("created_at", { ascending: false })
        .limit(20)

      if (marketBuyError) {
        console.error("Error fetching market buy orders:", marketBuyError)
        throw marketBuyError
      }

      // Fetch market sell orders (all users, active orders)
      const { data: marketSells, error: marketSellError } = await supabase
        .from("sell_orders")
        .select("*")
        .in("status", ["PENDING", "PARTIAL"])
        .order("created_at", { ascending: false })
        .limit(20)

      if (marketSellError) {
        console.error("Error fetching market sell orders:", marketSellError)
        throw marketSellError
      }

      // Fetch user's buy orders (all statuses for history)
      const { data: userBuys, error: userBuyError } = await supabase
        .from("buy_orders")
        .select("*")
        .eq("user_uuid", user.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (userBuyError) {
        console.error("Error fetching user buy orders:", userBuyError)
        throw userBuyError
      }

      // Fetch user's sell orders (all statuses for history)
      const { data: userSells, error: userSellError } = await supabase
        .from("sell_orders")
        .select("*")
        .eq("user_uuid", user.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (userSellError) {
        console.error("Error fetching user sell orders:", userSellError)
        throw userSellError
      }

      // Process and ensure all numeric fields are properly handled
      const processedMarketBuys = (marketBuys || []).map((order) => ({
        ...order,
        total_amount: Number(order.total_amount) || 0,
        price_per_share: Number(order.price_per_share) || 0,
        filled_amount: Number(order.filled_amount) || 0,
      }))

      const processedMarketSells = (marketSells || []).map((order) => ({
        ...order,
        shares: Number(order.shares) || 0,
        price_per_share: Number(order.price_per_share) || 0,
        filled_shares: Number(order.filled_shares) || 0,
      }))

      const processedUserBuys = (userBuys || []).map((order) => ({
        ...order,
        total_amount: Number(order.total_amount) || 0,
        price_per_share: Number(order.price_per_share) || 0,
        filled_amount: Number(order.filled_amount) || 0,
      }))

      const processedUserSells = (userSells || []).map((order) => ({
        ...order,
        shares: Number(order.shares) || 0,
        price_per_share: Number(order.price_per_share) || 0,
        filled_shares: Number(order.filled_shares) || 0,
      }))

      setMarketBuyOrders(processedMarketBuys)
      setMarketSellOrders(processedMarketSells)
      setUserBuyOrders(processedUserBuys)
      setUserSellOrders(processedUserSells)

      console.log("✅ Orders refreshed:", {
        marketBuys: processedMarketBuys.length,
        marketSells: processedMarketSells.length,
        userBuys: processedUserBuys.length,
        userSells: processedUserSells.length,
      })
    } catch (err: any) {
      console.error("Error refreshing orders:", err)
      setError(err.message || "Failed to refresh orders")
    } finally {
      setLoading(false)
    }
  }, [user])

  // Place buy order
  const placeBuyOrder = async (amount: number) => {
    if (!user) throw new Error("User not authenticated")

    try {
      setLoading(true)
      setError(null)

      console.log(`🛒 Placing buy order for N$${amount}`)

      const { data, error: orderError } = await supabase.rpc("place_buy_order", {
        p_user_uuid: user.id,
        p_total_amount: amount,
      })

      if (orderError) {
        console.error("Error placing buy order:", orderError)
        throw orderError
      }

      console.log("✅ Buy order placed successfully:", data)

      // Refresh orders and balances
      await Promise.all([refreshOrders(), refreshBalances()])
    } catch (err: any) {
      console.error("Error placing buy order:", err)
      setError(err.message || "Failed to place buy order")
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Place sell order
  const placeSellOrder = async (shares: number, pricePerShare: number) => {
    if (!user) throw new Error("User not authenticated")

    try {
      setLoading(true)
      setError(null)

      console.log(`🏷️ Placing sell order for ${shares} shares at N$${pricePerShare} each`)

      const { data, error: orderError } = await supabase.rpc("place_sell_order", {
        p_user_uuid: user.id,
        p_shares: shares,
        p_price_per_share: pricePerShare,
      })

      if (orderError) {
        console.error("Error placing sell order:", orderError)
        throw orderError
      }

      console.log("✅ Sell order placed successfully:", data)

      // Refresh orders and balances
      await Promise.all([refreshOrders(), refreshBalances()])
    } catch (err: any) {
      console.error("Error placing sell order:", err)
      setError(err.message || "Failed to place sell order")
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Load orders when user changes
  useEffect(() => {
    if (user) {
      refreshOrders()
    }
  }, [user, refreshOrders])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return

    console.log("🔔 Setting up real-time subscriptions for exchange orders")

    // Subscribe to buy orders changes
    const buyOrdersSubscription = supabase
      .channel("buy_orders_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "buy_orders",
        },
        (payload) => {
          console.log("📡 Buy orders change detected:", payload)
          refreshOrders()
        },
      )
      .subscribe()

    // Subscribe to sell orders changes
    const sellOrdersSubscription = supabase
      .channel("sell_orders_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sell_orders",
        },
        (payload) => {
          console.log("📡 Sell orders change detected:", payload)
          refreshOrders()
        },
      )
      .subscribe()

    return () => {
      console.log("🔕 Cleaning up exchange subscriptions")
      buyOrdersSubscription.unsubscribe()
      sellOrdersSubscription.unsubscribe()
    }
  }, [user, refreshOrders])

  const value = {
    marketBuyOrders,
    marketSellOrders,
    userBuyOrders,
    userSellOrders,
    placeBuyOrder,
    placeSellOrder,
    refreshOrders,
    loading,
    error,
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
