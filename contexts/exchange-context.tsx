"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { useWallet } from "@/contexts/wallet-context"
import {
  getUserBuyOrderStatuses,
  getUserSellOrderStatuses,
  type BuyOrderStatus,
  type SellOrderStatus,
} from "@/types/order-enums"

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

interface TradingStatus {
  trading_allowed: boolean
  reason?: string
  current_time: string
  next_trading_window?: string
  weekly_price?: number
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
  tradingStatus: TradingStatus | null

  /* ui state */
  loading: boolean
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
  const [tradingStatus, setTradingStatus] = useState<TradingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { user, session } = useAuth()
  const {
    buyWalletBalance,
    holdWalletPostHold,
    refreshBalances: refreshWalletBalances,
    updateBuyWallet,
    updateHoldWallet,
  } = useWallet()

  /* ---------- queries ---------- */
  const fetchTradingStatus = async () => {
    try {
      const { data, error } = await supabase.rpc("is_trading_allowed")

      if (error) {
        console.error("Error fetching trading status:", error)
        return
      }

      setTradingStatus(data)

      // Update current price from weekly price if available
      if (data.weekly_price) {
        setCurrentSharePrice(data.weekly_price)
        setLastPriceUpdate(data.current_time)
      }

      console.log("🕐 Trading status:", data)
    } catch (err) {
      console.error("Error fetching trading status:", err)
    }
  }

  const fetchSharePrice = async () => {
    try {
      // First try to get weekly price
      const { data: weeklyData, error: weeklyError } = await supabase
        .from("weekly_price")
        .select("price, week_start_date")
        .order("week_start_date", { ascending: false })
        .limit(1)

      if (!weeklyError && weeklyData && weeklyData.length > 0) {
        setCurrentSharePrice(Number(weeklyData[0].price))
        setLastPriceUpdate(weeklyData[0].week_start_date)
        console.log("📈 Weekly share price:", weeklyData[0].price, "for week:", weeklyData[0].week_start_date)
        return
      }

      // Fallback to current_pricing_info
      const { data, error } = await supabase
        .from("current_pricing_info")
        .select("current_price, week_start, latest_hodl_date")
        .order("week_start", { ascending: false })
        .limit(1)

      if (error) {
        console.error("Error fetching price:", error)
        setCurrentSharePrice(100)
        return
      }

      if (data && data.length > 0) {
        const latestPrice = data[0]
        setCurrentSharePrice(Number(latestPrice.current_price) || 100)
        setLastPriceUpdate(latestPrice.latest_hodl_date || latestPrice.week_start)
      } else {
        setCurrentSharePrice(100)
      }
    } catch (err) {
      console.error("Error fetching price", err)
      setCurrentSharePrice(100)
    }
  }

  const refreshOrders = async () => {
    if (!user || !session) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Refreshing orders...")

      // ✅ GLOBAL MARKET ORDERS - Only show active orders
      const [marketSellResult, marketBuyResult] = await Promise.all([
        supabase
          .from("sell_orders")
          .select("*")
          .in("status", ["available", "partial"])
          .order("price_per_share", { ascending: true }) // Lowest price first
          .order("created_at", { ascending: true }), // Oldest first
        supabase
          .from("buy_orders")
          .select("*")
          .in("status", ["pending", "partial"])
          .order("price_per_share", { ascending: false }) // Highest price first
          .order("created_at", { ascending: true }), // Oldest first
      ])

      // USER-SPECIFIC orders - Show all user orders including completed ones
      const [userSellResult, userBuyResult] = await Promise.all([
        supabase
          .from("sell_orders")
          .select("*")
          .eq("user_uuid", user.id)
          .in("status", getUserSellOrderStatuses())
          .order("created_at", { ascending: false }),
        supabase
          .from("buy_orders")
          .select("*")
          .eq("user_uuid", user.id)
          .in("status", getUserBuyOrderStatuses())
          .order("created_at", { ascending: false }),
      ])

      console.log("📊 Query results:")
      console.log("  Market Sell Orders:", marketSellResult.data?.length || 0)
      console.log("  Market Buy Orders:", marketBuyResult.data?.length || 0)
      console.log("  User Sell Orders:", userSellResult.data?.length || 0)
      console.log("  User Buy Orders:", userBuyResult.data?.length || 0)

      /* Map market orders (ALL USERS) */
      const mappedMarketSell = (marketSellResult.data || []).map((r: any) => ({
        id: r.id,
        user_uuid: r.user_uuid,
        shares: r.shares_available || 0,
        price_per_share: r.price_per_share || 0,
        status: r.status || "available",
        created_at: r.created_at,
        filled_shares: (r.shares_available || 0) - (r.shares_remaining || 0),
        shares_remaining: r.shares_remaining || 0,
      }))

      const mappedMarketBuy = (marketBuyResult.data || []).map((r: any) => ({
        id: r.id,
        user_uuid: r.user_uuid,
        total_amount: r.total_amount || 0,
        price_per_share: r.price_per_share || 0,
        status: r.status || "pending",
        created_at: r.created_at,
        filled_amount: r.amount_filled || 0,
        shares_requested: r.shares_requested || 0,
        shares_filled: r.shares_filled || 0,
      }))

      /* Map user orders (CURRENT USER ONLY) */
      const mappedUserSell = (userSellResult.data || []).map((r: any) => ({
        id: r.id,
        user_uuid: r.user_uuid,
        shares: r.shares_available || 0,
        price_per_share: r.price_per_share || 0,
        status: r.status || "available",
        created_at: r.created_at,
        filled_shares: (r.shares_available || 0) - (r.shares_remaining || 0),
        shares_remaining: r.shares_remaining || 0,
      }))

      const mappedUserBuy = (userBuyResult.data || []).map((r: any) => ({
        id: r.id,
        user_uuid: r.user_uuid,
        total_amount: r.total_amount || 0,
        price_per_share: r.price_per_share || 0,
        status: r.status || "pending",
        created_at: r.created_at,
        filled_amount: r.amount_filled || 0,
        shares_requested: r.shares_requested || 0,
        shares_filled: r.shares_filled || 0,
      }))

      // Update state
      setMarketSellOrders(mappedMarketSell)
      setMarketBuyOrders(mappedMarketBuy)
      setUserSellOrders(mappedUserSell)
      setUserBuyOrders(mappedUserBuy)

      console.log("✅ Orders updated")
    } catch (err: any) {
      console.error("❌ Refresh orders error", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /* ---------- actions ---------- */
  const placeBuyOrder = useCallback(
    async (amount: number) => {
      if (!user) return { success: false, message: "Not authenticated" }
      if (!tradingStatus?.trading_allowed) {
        return { success: false, message: tradingStatus?.reason || "Trading not allowed" }
      }
      if (amount <= 0) return { success: false, message: "Invalid amount" }
      if (amount < 50) return { success: false, message: "Minimum purchase is N$50" }
      if (amount > buyWalletBalance) return { success: false, message: "Insufficient Buy-wallet funds" }

      try {
        // Immediate UI update (optimistic)
        console.log("💰 Immediately deducting N$", amount, "from buy wallet")
        await updateBuyWallet(amount, "subtract")

        console.log("📤 Placing buy order:", { amount, currentSharePrice, user_id: user.id })

        const { data, error } = await supabase.rpc("place_buy_order", {
          p_user_uuid: user.id,
          p_price_per_share: currentSharePrice,
          p_total_amount: amount,
        })

        console.log("📥 Buy order result:", { data, error })

        if (error) {
          // Rollback on error
          console.log("❌ Error - rolling back wallet deduction")
          await updateBuyWallet(amount, "add")
          throw error
        }

        // Trigger order matching
        console.log("🔄 Triggering order matching...")
        const matchResult = await supabase.rpc("match_orders")
        console.log("🔄 Match result:", matchResult)

        // Refresh orders and balances
        await refreshOrders()
        await refreshWalletBalances()

        return {
          success: true,
          message: `Buy order placed for ${(amount / currentSharePrice).toFixed(4)} shares`,
        }
      } catch (e: any) {
        console.error("❌ Buy order error", e)
        return { success: false, message: e.message }
      }
    },
    [user, currentSharePrice, buyWalletBalance, tradingStatus, updateBuyWallet, refreshWalletBalances],
  )

  const placeSellOrder = useCallback(
    async (shares: number) => {
      if (!user) return { success: false, message: "Not authenticated" }
      if (!tradingStatus?.trading_allowed) {
        return { success: false, message: tradingStatus?.reason || "Trading not allowed" }
      }
      if (shares <= 0) return { success: false, message: "Invalid amount" }
      if (shares < 0.0001) return { success: false, message: "Minimum sell is 0.0001 shares" }
      if (shares > holdWalletPostHold) return { success: false, message: "Insufficient Post-hold shares" }

      try {
        // Immediate UI update (optimistic)
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

        // Trigger order matching
        console.log("🔄 Triggering order matching...")
        const matchResult = await supabase.rpc("match_orders")
        console.log("🔄 Match result:", matchResult)

        // Refresh orders and balances
        await refreshOrders()
        await refreshWalletBalances()

        return {
          success: true,
          message: `Sell order placed for ${shares.toFixed(4)} shares`,
        }
      } catch (e: any) {
        console.error("❌ Sell order error", e)
        return { success: false, message: e.message }
      }
    },
    [user, currentSharePrice, holdWalletPostHold, tradingStatus, updateHoldWallet, refreshWalletBalances],
  )

  /* ---------- Auto-refresh ---------- */
  useEffect(() => {
    fetchTradingStatus()
    fetchSharePrice()
    refreshOrders()

    // Refresh trading status every minute
    const statusInterval = setInterval(fetchTradingStatus, 60000)
    // Refresh price every 5 minutes
    const priceInterval = setInterval(fetchSharePrice, 300000)

    return () => {
      clearInterval(statusInterval)
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
    tradingStatus,
    loading,
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
