"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import { useWallet } from "@/contexts/wallet-context"

// Order interfaces
interface BuyOrder {
  id: string
  user_uuid: string
  shares_requested: number
  price_per_share: number
  total_amount: number
  shares_filled: number
  status: string
  created_at: string
  expires_at: string
}

interface SellOrder {
  id: string
  user_uuid: string
  shares_offered: number
  price_per_share: number
  total_amount: number
  shares_filled: number
  status: string
  created_at: string
  expires_at: string
}

interface MatchedOrder {
  id: string
  buy_order_id: string
  sell_order_id: string
  buyer_uuid: string
  seller_uuid: string
  shares_matched: number
  price_per_share: number
  total_amount: number
  status: string
  created_at: string
}

interface ExchangeContextType {
  // Orders
  buyOrders: BuyOrder[]
  sellOrders: SellOrder[]
  userBuyOrders: BuyOrder[]
  userSellOrders: SellOrder[]
  matchedOrders: MatchedOrder[]

  // Actions
  placeBuyOrder: (shares: number, pricePerShare: number) => Promise<void>
  placeSellOrder: (shares: number, pricePerShare: number) => Promise<void>
  cancelBuyOrder: (orderId: string) => Promise<void>
  cancelSellOrder: (orderId: string) => Promise<void>

  // Data refresh
  refreshOrders: (silent?: boolean) => Promise<void>

  // State
  loading: boolean
  error: string | null
  placingOrder: boolean
}

const ExchangeContext = createContext<ExchangeContextType | undefined>(undefined)

export function ExchangeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { refreshWalletBalances } = useWallet()

  // State
  const [buyOrders, setBuyOrders] = useState<BuyOrder[]>([])
  const [sellOrders, setSellOrders] = useState<SellOrder[]>([])
  const [userBuyOrders, setUserBuyOrders] = useState<BuyOrder[]>([])
  const [userSellOrders, setUserSellOrders] = useState<SellOrder[]>([])
  const [matchedOrders, setMatchedOrders] = useState<MatchedOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [placingOrder, setPlacingOrder] = useState(false)

  // Helper function to safely convert to number
  const safeNumber = (value: any): number => {
    const num = Number(value)
    return isNaN(num) ? 0 : num
  }

  // Refresh all orders data
  const refreshOrders = useCallback(
    async (silent = false) => {
      if (!user) return

      try {
        if (!silent) {
          setLoading(true)
          setError(null)
        }

        console.log("🔄 Refreshing exchange orders...")

        // Fetch all buy orders (available and partial only for market display)
        const { data: allBuyOrders, error: buyOrdersError } = await supabase
          .from("buy_orders")
          .select("*")
          .in("status", ["available", "partial"]) // Use lowercase enum values
          .order("price_per_share", { ascending: false })
          .order("created_at", { ascending: true })

        if (buyOrdersError) {
          console.error("Error fetching buy orders:", buyOrdersError)
          throw new Error(`Failed to fetch buy orders: ${buyOrdersError.message}`)
        }

        // Fetch all sell orders (available and partial only for market display)
        const { data: allSellOrders, error: sellOrdersError } = await supabase
          .from("sell_orders")
          .select("*")
          .in("status", ["available", "partial"]) // Use lowercase enum values
          .order("price_per_share", { ascending: true })
          .order("created_at", { ascending: true })

        if (sellOrdersError) {
          console.error("Error fetching sell orders:", sellOrdersError)
          throw new Error(`Failed to fetch sell orders: ${sellOrdersError.message}`)
        }

        // Fetch user's buy orders (all statuses for user's view)
        const { data: userBuys, error: userBuyError } = await supabase
          .from("buy_orders")
          .select("*")
          .eq("user_uuid", user.id)
          .order("created_at", { ascending: false })

        if (userBuyError) {
          console.error("Error fetching user buy orders:", userBuyError)
          throw new Error(`Failed to fetch user buy orders: ${userBuyError.message}`)
        }

        // Fetch user's sell orders (all statuses for user's view)
        const { data: userSells, error: userSellError } = await supabase
          .from("sell_orders")
          .select("*")
          .eq("user_uuid", user.id)
          .order("created_at", { ascending: false })

        if (userSellError) {
          console.error("Error fetching user sell orders:", userSellError)
          throw new Error(`Failed to fetch user sell orders: ${userSellError.message}`)
        }

        // Fetch matched orders for user
        const { data: matches, error: matchError } = await supabase
          .from("matched_orders")
          .select("*")
          .or(`buyer_uuid.eq.${user.id},seller_uuid.eq.${user.id}`)
          .order("created_at", { ascending: false })

        if (matchError) {
          console.error("Error fetching matched orders:", matchError)
          throw new Error(`Failed to fetch matched orders: ${matchError.message}`)
        }

        // Process and set data with safe number conversion
        const processedBuyOrders = (allBuyOrders || []).map((order) => ({
          ...order,
          shares_requested: safeNumber(order.shares_requested),
          price_per_share: safeNumber(order.price_per_share),
          total_amount: safeNumber(order.total_amount),
          shares_filled: safeNumber(order.shares_filled),
        }))

        const processedSellOrders = (allSellOrders || []).map((order) => ({
          ...order,
          shares_offered: safeNumber(order.shares_offered),
          price_per_share: safeNumber(order.price_per_share),
          total_amount: safeNumber(order.total_amount),
          shares_filled: safeNumber(order.shares_filled),
        }))

        const processedUserBuyOrders = (userBuys || []).map((order) => ({
          ...order,
          shares_requested: safeNumber(order.shares_requested),
          price_per_share: safeNumber(order.price_per_share),
          total_amount: safeNumber(order.total_amount),
          shares_filled: safeNumber(order.shares_filled),
        }))

        const processedUserSellOrders = (userSells || []).map((order) => ({
          ...order,
          shares_offered: safeNumber(order.shares_offered),
          price_per_share: safeNumber(order.price_per_share),
          total_amount: safeNumber(order.total_amount),
          shares_filled: safeNumber(order.shares_filled),
        }))

        const processedMatchedOrders = (matches || []).map((order) => ({
          ...order,
          shares_matched: safeNumber(order.shares_matched),
          price_per_share: safeNumber(order.price_per_share),
          total_amount: safeNumber(order.total_amount),
        }))

        setBuyOrders(processedBuyOrders)
        setSellOrders(processedSellOrders)
        setUserBuyOrders(processedUserBuyOrders)
        setUserSellOrders(processedUserSellOrders)
        setMatchedOrders(processedMatchedOrders)

        if (!silent) {
          console.log("✅ Exchange orders refreshed:", {
            buyOrders: processedBuyOrders.length,
            sellOrders: processedSellOrders.length,
            userBuyOrders: processedUserBuyOrders.length,
            userSellOrders: processedUserSellOrders.length,
            matchedOrders: processedMatchedOrders.length,
          })
        }
      } catch (err: any) {
        if (!silent) {
          console.error("❌ Error refreshing orders:", err)
          setError(err.message || "Failed to refresh orders")
        }
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    },
    [user],
  )

  // Place buy order
  const placeBuyOrder = async (shares: number, pricePerShare: number) => {
    if (!user) throw new Error("User not authenticated")

    try {
      setPlacingOrder(true)
      setError(null)

      console.log("📝 Placing buy order:", { shares, pricePerShare })

      const { data, error } = await supabase.rpc("place_buy_order", {
        p_user_uuid: user.id,
        p_shares_requested: shares,
        p_price_per_share: pricePerShare,
      })

      if (error) {
        console.error("Error placing buy order:", error)
        throw new Error(`Failed to place buy order: ${error.message}`)
      }

      console.log("✅ Buy order placed successfully:", data)

      // Refresh orders and wallet balances
      await Promise.all([refreshOrders(true), refreshWalletBalances(true)])
    } catch (err: any) {
      console.error("❌ Error placing buy order:", err)
      setError(err.message || "Failed to place buy order")
      throw err
    } finally {
      setPlacingOrder(false)
    }
  }

  // Place sell order
  const placeSellOrder = async (shares: number, pricePerShare: number) => {
    if (!user) throw new Error("User not authenticated")

    try {
      setPlacingOrder(true)
      setError(null)

      console.log("📝 Placing sell order:", { shares, pricePerShare })

      const { data, error } = await supabase.rpc("place_sell_order", {
        p_user_uuid: user.id,
        p_shares_offered: shares,
        p_price_per_share: pricePerShare,
      })

      if (error) {
        console.error("Error placing sell order:", error)
        throw new Error(`Failed to place sell order: ${error.message}`)
      }

      console.log("✅ Sell order placed successfully:", data)

      // Refresh orders and wallet balances
      await Promise.all([refreshOrders(true), refreshWalletBalances(true)])
    } catch (err: any) {
      console.error("❌ Error placing sell order:", err)
      setError(err.message || "Failed to place sell order")
      throw err
    } finally {
      setPlacingOrder(false)
    }
  }

  // Cancel buy order
  const cancelBuyOrder = async (orderId: string) => {
    if (!user) throw new Error("User not authenticated")

    try {
      setError(null)

      console.log("❌ Cancelling buy order:", orderId)

      const { data, error } = await supabase.rpc("cancel_buy_order", {
        p_order_id: orderId,
        p_user_uuid: user.id,
      })

      if (error) {
        console.error("Error cancelling buy order:", error)
        throw new Error(`Failed to cancel buy order: ${error.message}`)
      }

      console.log("✅ Buy order cancelled successfully:", data)

      // Refresh orders and wallet balances
      await Promise.all([refreshOrders(true), refreshWalletBalances(true)])
    } catch (err: any) {
      console.error("❌ Error cancelling buy order:", err)
      setError(err.message || "Failed to cancel buy order")
      throw err
    }
  }

  // Cancel sell order
  const cancelSellOrder = async (orderId: string) => {
    if (!user) throw new Error("User not authenticated")

    try {
      setError(null)

      console.log("❌ Cancelling sell order:", orderId)

      const { data, error } = await supabase.rpc("cancel_sell_order", {
        p_order_id: orderId,
        p_user_uuid: user.id,
      })

      if (error) {
        console.error("Error cancelling sell order:", error)
        throw new Error(`Failed to cancel sell order: ${error.message}`)
      }

      console.log("✅ Sell order cancelled successfully:", data)

      // Refresh orders and wallet balances
      await Promise.all([refreshOrders(true), refreshWalletBalances(true)])
    } catch (err: any) {
      console.error("❌ Error cancelling sell order:", err)
      setError(err.message || "Failed to cancel sell order")
      throw err
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

    console.log("🔔 Setting up exchange real-time subscriptions")

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
          refreshOrders(true)
        },
      )
      .subscribe()

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
          refreshOrders(true)
        },
      )
      .subscribe()

    const matchedOrdersSubscription = supabase
      .channel("matched_orders_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matched_orders",
        },
        (payload) => {
          console.log("📡 Matched orders change detected:", payload)
          refreshOrders(true)
        },
      )
      .subscribe()

    return () => {
      console.log("🔕 Cleaning up exchange subscriptions")
      buyOrdersSubscription.unsubscribe()
      sellOrdersSubscription.unsubscribe()
      matchedOrdersSubscription.unsubscribe()
    }
  }, [user, refreshOrders])

  const value = {
    // Orders
    buyOrders,
    sellOrders,
    userBuyOrders,
    userSellOrders,
    matchedOrders,

    // Actions
    placeBuyOrder,
    placeSellOrder,
    cancelBuyOrder,
    cancelSellOrder,

    // Data refresh
    refreshOrders,

    // State
    loading,
    error,
    placingOrder,
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
