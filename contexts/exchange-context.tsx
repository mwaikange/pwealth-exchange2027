"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import { useWallet } from "@/contexts/wallet-context"
import type { BuyOrderStatus, SellOrderStatus } from "@/types/order-enums"

/* ---------- Types ---------- */
export interface SellOrder {
  id: string
  user_uuid: string
  shares: number
  price_per_share: number
  status: SellOrderStatus
  created_at: string
  filled_shares: number
  shares_remaining: number
}

export interface BuyOrder {
  id: string
  user_uuid: string
  total_amount: number
  price_per_share: number
  status: BuyOrderStatus
  created_at: string
  filled_amount: number
  shares_requested: number
  shares_filled: number
}

interface ExchangeContextType {
  /* GLOBAL MARKET ORDERS (all users) */
  marketSellOrders: SellOrder[]
  marketBuyOrders: BuyOrder[]

  /* USER-SPECIFIC ORDERS (private) */
  userSellOrders: SellOrder[]
  userBuyOrders: BuyOrder[]

  /* actions */
  placeBuyOrder: (amount: number) => Promise<{ success: boolean; message: string }>
  placeSellOrder: (shares: number) => Promise<{ success: boolean; message: string }>

  /* market data  */
  currentSharePrice: number
  lastPriceUpdate: string | null

  /* ui state */
  loading: boolean // Only true on initial load
  error: string | null
  refreshOrders: () => Promise<void>
}

/* ---------- Context ---------- */
const ExchangeContext = createContext<ExchangeContextType | undefined>(undefined)

/* ---------- Provider ---------- */
export function ExchangeProvider({ children }: { children: React.ReactNode }) {
  // GLOBAL market orders (all users)
  const [marketSellOrders, setMarketSellOrders] = useState<SellOrder[]>([])
  const [marketBuyOrders, setMarketBuyOrders] = useState<BuyOrder[]>([])

  // USER-SPECIFIC orders (private)
  const [userSellOrders, setUserSellOrders] = useState<SellOrder[]>([])
  const [userBuyOrders, setUserBuyOrders] = useState<BuyOrder[]>([])

  const [currentSharePrice, setCurrentSharePrice] = useState(100)
  const [lastPriceUpdate, setLastPriceUpdate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true) // Only true on initial load
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false) // Track if we've loaded data once

  const { user, session } = useAuth()
  const { buyWalletBalance, holdWalletPostHold, refreshWalletBalances, updateBuyWallet, updateHoldWallet } = useWallet()

  /* ---------- queries ---------- */
  const fetchSharePrice = async (silent = false) => {
    try {
      // ✅ Use current_pricing_info table instead of share_supply
      const { data, error } = await supabase
        .from("current_pricing_info")
        .select("current_price, week_start, latest_hodl_date")
        .order("week_start", { ascending: false })
        .limit(1)

      if (error) {
        console.error("Error fetching price from current_pricing_info:", error)
        // Fallback to RPC function
        const rpcResult = await supabase.rpc("get_current_share_price")
        if (rpcResult.data) {
          setCurrentSharePrice(Number(rpcResult.data))
        }
        return
      }

      // ✅ Handle array response (data is an array, not single object)
      if (data && data.length > 0) {
        const latestPrice = data[0] // Get first (most recent) row
        setCurrentSharePrice(Number(latestPrice.current_price) || 100)
        setLastPriceUpdate(latestPrice.latest_hodl_date || latestPrice.week_start)
        if (!silent) {
          console.log("📈 Current share price:", latestPrice.current_price, "week:", latestPrice.week_start)
        }
      } else {
        // No data found, use fallback
        if (!silent) {
          console.log("No price data found, using fallback")
        }
        setCurrentSharePrice(100)
      }
    } catch (err) {
      if (!silent) {
        console.error("Error fetching price", err)
      }
      setCurrentSharePrice(100)
    }
  }

  const refreshOrders = async (silent = false) => {
    if (!user || !session) {
      if (!isInitialized) {
        setLoading(false)
      }
      return
    }

    try {
      // Only show loading on initial load, not on background refreshes
      if (!isInitialized) {
        setLoading(true)
      }

      if (!silent) {
        setError(null)
      }

      if (!silent) {
        console.log("🔄 Refreshing orders...")
      }

      // GLOBAL MARKET ORDERS - Show active and recent orders
      const [marketSellResult, marketBuyResult] = await Promise.all([
        supabase
          .from("sell_orders")
          .select("*")
          .in("status", ["available", "partial"]) // Only active orders for market view
          .order("created_at", { ascending: true }),
        supabase
          .from("buy_orders")
          .select("*")
          .in("status", ["pending", "partial"]) // Only active orders for market view
          .order("created_at", { ascending: true }),
      ])

      // USER-SPECIFIC orders - Show ALL orders including completed ones
      const [userSellResult, userBuyResult] = await Promise.all([
        supabase.from("sell_orders").select("*").eq("user_uuid", user.id).order("created_at", { ascending: false }),
        supabase.from("buy_orders").select("*").eq("user_uuid", user.id).order("created_at", { ascending: false }),
      ])

      // Format all numeric values to proper decimal places
      const formatOrderData = (orders: any[], isUserOrder = false) => {
        return orders.map((order: any) => ({
          ...order,
          // Fix numeric conversions with proper fallbacks
          total_amount: Number(order.total_amount || 0),
          price_per_share: Number(order.price_per_share || 0),
          shares: Number(order.shares || order.shares_available || 0), // Add this line for sell orders
          shares_available: Number(order.shares_available || order.shares || 0), // Add this line
          shares_requested: Number(order.shares_requested || order.shares_available || order.shares || 0),
          shares_filled: Number(order.shares_filled || order.filled_shares || 0),
          shares_remaining: Number(order.shares_remaining || order.shares_available - order.shares_filled || 0),
          filled_shares: Number(order.filled_shares || order.shares_filled || 0), // Add this line
          filled_amount: Number(order.filled_amount || 0), // Ensure this is always a number
          amount_filled: Number(
            order.amount_filled ||
              (order.shares_filled || order.filled_shares || 0) * (order.price_per_share || 0) ||
              0,
          ),
        }))
      }

      setMarketSellOrders(formatOrderData(marketSellResult.data || []))
      setMarketBuyOrders(formatOrderData(marketBuyResult.data || []))
      setUserSellOrders(formatOrderData(userSellResult.data || [], true))
      setUserBuyOrders(formatOrderData(userBuyResult.data || [], true))

      if (!silent) {
        console.log("✅ Orders refreshed successfully")
        console.log("User buy orders:", userBuyResult.data?.length || 0)
        console.log("Market buy orders:", marketBuyResult.data?.length || 0)
      }

      // Mark as initialized after first successful load
      if (!isInitialized) {
        setIsInitialized(true)
      }
    } catch (err: any) {
      if (!silent) {
        console.error("❌ Refresh orders error", err)
        setError(err.message)
      }
    } finally {
      // Only set loading to false if this was the initial load
      if (!isInitialized) {
        setLoading(false)
      }
    }
  }

  /* ---------- actions with IMMEDIATE UI updates ---------- */
  const placeBuyOrder = useCallback(
    async (amount: number) => {
      if (!user) return { success: false, message: "Not authenticated" }
      if (amount <= 0) return { success: false, message: "Invalid amount" }
      if (amount < 50) return { success: false, message: "Minimum purchase is N$50" }
      if (amount > buyWalletBalance) return { success: false, message: "Insufficient Buy-wallet funds" }

      try {
        // 🚀 IMMEDIATE UI UPDATE (optimistic)
        console.log("💰 Immediately deducting N$", amount, "from buy wallet")
        await updateBuyWallet(amount, "subtract")

        console.log("📤 Placing buy order:", { amount, currentSharePrice, user_id: user.id })

        // ✅ Place order with 30-second delay before matching - REMOVED MINIMUM AMOUNT CHECK
        const { data, error } = await supabase.rpc("place_buy_order_with_delay", {
          p_user_uuid: user.id,
          p_price_per_share: currentSharePrice,
          p_total_amount: amount,
          p_delay_seconds: 30,
        })

        console.log("📥 Buy order result:", { data, error })

        if (error) {
          // Rollback on error
          console.log("❌ Error - rolling back wallet deduction")
          await updateBuyWallet(amount, "add")
          throw error
        }

        // Refresh orders silently to show new order
        await refreshOrders(true)
        await refreshWalletBalances(true)

        const estimatedShares = (amount / currentSharePrice).toFixed(4)
        return {
          success: true,
          message: `Buy order placed for ${estimatedShares} shares. Will be matched in 30 seconds.`,
        }
      } catch (e: any) {
        console.error("❌ Buy order error", e)
        return { success: false, message: e.message }
      }
    },
    [user, currentSharePrice, buyWalletBalance, updateBuyWallet, refreshWalletBalances],
  )

  const placeSellOrder = useCallback(
    async (shares: number) => {
      if (!user) return { success: false, message: "Not authenticated" }
      if (shares <= 0) return { success: false, message: "Invalid amount" }
      if (shares < 0.5) return { success: false, message: "Minimum sell is 0.5 shares" }
      if (shares > holdWalletPostHold) return { success: false, message: "Insufficient Post-hold shares" }

      try {
        // 🚀 IMMEDIATE UI UPDATE (optimistic)
        console.log("📈 Immediately deducting", shares, "shares from post-hold wallet")
        await updateHoldWallet(shares, "subtract", "post")

        console.log("📤 Placing sell order:", { shares, currentSharePrice, user_id: user.id })

        const { data, error } = await supabase.rpc("place_sell_order", {
          p_user_uuid: user.id,
          p_price_per_share: currentSharePrice,
          p_shares: shares,
        })

        console.log("📥 Sell order result:", { data, error })

        if (error) {
          // Rollback on error
          console.log("❌ Error - rolling back share deduction")
          await updateHoldWallet(shares, "add", "post")
          throw error
        }

        // Trigger immediate order matching for sell orders
        console.log("🔄 Triggering order matching...")
        const matchResult = await supabase.rpc("match_orders")
        console.log("🔄 Match result:", matchResult)

        // Refresh orders silently to show new order and any matches
        await refreshOrders(true)
        await refreshWalletBalances(true)

        return {
          success: true,
          message: `Sell order placed for ${shares} shares`,
        }
      } catch (e: any) {
        console.error("❌ Sell order error", e)
        return { success: false, message: e.message }
      }
    },
    [user, currentSharePrice, holdWalletPostHold, updateHoldWallet, refreshWalletBalances],
  )

  /* ---------- Background polling setup ---------- */
  useEffect(() => {
    if (!user || !session) return

    // Initial load (with loading state)
    const initialLoad = async () => {
      await Promise.all([
        fetchSharePrice(false), // Not silent for initial load
        refreshOrders(false), // Not silent for initial load
      ])
    }

    initialLoad()

    // Set up background polling (silent updates)
    const ordersInterval = setInterval(() => {
      refreshOrders(true) // Silent background refresh
    }, 10000) // Every 10 seconds

    const priceInterval = setInterval(() => {
      fetchSharePrice(true) // Silent background refresh
    }, 300000) // Every 5 minutes

    return () => {
      clearInterval(ordersInterval)
      clearInterval(priceInterval)
    }
  }, [user, session])

  /* ---------- context value ---------- */
  const ctx: ExchangeContextType = {
    // GLOBAL market orders (all users)
    marketSellOrders,
    marketBuyOrders,

    // USER-SPECIFIC orders (private)
    userSellOrders,
    userBuyOrders,

    placeBuyOrder,
    placeSellOrder,
    currentSharePrice,
    lastPriceUpdate,
    loading, // Only true on initial load
    error,
    refreshOrders,
  }

  return <ExchangeContext.Provider value={ctx}>{children}</ExchangeContext.Provider>
}

/* ---------- hook ---------- */
export function useExchange() {
  const ctx = useContext(ExchangeContext)
  if (!ctx) throw new Error("useExchange must be inside ExchangeProvider")
  return ctx
}
