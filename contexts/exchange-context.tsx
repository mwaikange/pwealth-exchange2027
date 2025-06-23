"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import { useWallet } from "@/contexts/wallet-context"

/* ---------- Types ---------- */
export interface SellOrder {
  id: string
  user_uuid: string
  shares: number
  price_per_share: number
  status: "available" | "matched" | "expired" | "cancelled"
  created_at: string
  filled_shares: number
  shares_remaining: number
}

export interface BuyOrder {
  id: string
  user_uuid: string
  total_amount: number
  price_per_share: number
  status: "pending" | "completed" | "cancelled" | "matched"
  created_at: string
  filled_amount: number
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
  const fetchSharePrice = async () => {
    try {
      // Try the main function first, fallback to simple version
      let { data, error } = await supabase.rpc("get_current_share_price")

      if (error) {
        console.log("Trying fallback price function...")
        const fallback = await supabase.rpc("get_current_share_price_simple")
        data = fallback.data
        error = fallback.error
      }

      if (error) throw error
      setCurrentSharePrice(Number(data) || 100)
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

      // ✅ GLOBAL MARKET ORDERS - ALL USERS (same method for both buy and sell)
      const [marketSellResult, marketBuyResult] = await Promise.all([
        // Global sell orders - ALL users
        supabase
          .from("sell_orders")
          .select("*")
          .eq("status", "available")
          .order("created_at", { ascending: false }),
        // ✅ Global buy orders - ALL users (not filtered by user_uuid)
        supabase
          .from("buy_orders")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
      ])

      // USER-SPECIFIC orders (private)
      const [userSellResult, userBuyResult] = await Promise.all([
        supabase
          .from("sell_orders")
          .select("*")
          .eq("user_uuid", user.id)
          .in("status", ["available", "matched", "expired"])
          .order("created_at", { ascending: false }),
        supabase
          .from("buy_orders")
          .select("*")
          .eq("user_uuid", user.id)
          .in("status", ["pending", "completed", "matched"])
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

      // ✅ Map market buy orders (ALL USERS - same method as sell orders)
      const mappedMarketBuy = (marketBuyResult.data || []).map((r: any) => ({
        id: r.id,
        user_uuid: r.user_uuid,
        total_amount: r.total_amount || 0,
        price_per_share: r.price_per_share || 0,
        status: r.status || "pending",
        created_at: r.created_at,
        filled_amount: r.amount_filled || 0,
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
      }))

      // Update state
      setMarketSellOrders(mappedMarketSell)
      setMarketBuyOrders(mappedMarketBuy)
      setUserSellOrders(mappedUserSell)
      setUserBuyOrders(mappedUserBuy)

      console.log("✅ Orders updated:")
      console.log("  Market Sell:", mappedMarketSell.length)
      console.log("  Market Buy:", mappedMarketBuy.length)
      console.log("  User Sell:", mappedUserSell.length)
      console.log("  User Buy:", mappedUserBuy.length)
    } catch (err: any) {
      console.error("❌ Refresh orders error", err)
      setError(err.message)
    } finally {
      setLoading(false)
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

        // ✅ FIX: Use correct parameter order to match your function signature
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

        // Trigger order matching after placing order
        console.log("🔄 Triggering order matching...")
        await supabase.rpc("match_orders")

        // Refresh orders to show new order and any matches
        await refreshOrders()

        return {
          success: true,
          message: `Buy order placed for ${(amount / currentSharePrice).toFixed(2)} shares`,
        }
      } catch (e: any) {
        console.error("❌ Buy order error", e)
        return { success: false, message: e.message }
      }
    },
    [user, currentSharePrice, buyWalletBalance, updateBuyWallet],
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

        // Trigger order matching after placing order
        console.log("🔄 Triggering order matching...")
        await supabase.rpc("match_orders")

        // Refresh orders to show new order and any matches
        await refreshOrders()

        return {
          success: true,
          message: `Sell order placed for ${shares} shares`,
        }
      } catch (e: any) {
        console.error("❌ Sell order error", e)
        return { success: false, message: e.message }
      }
    },
    [user, currentSharePrice, holdWalletPostHold, updateHoldWallet],
  )

  /* ---------- lifecycle ---------- */
  useEffect(() => {
    fetchSharePrice()
    refreshOrders()
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
