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
  shares_available: number
  price_per_share: number
  status: SellOrderStatus
  created_at: string
  filled_shares: number
  shares_remaining: number
  sell_ref: string
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
  buy_ref: string
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
  cancelSellOrder: (orderId: string) => Promise<{ success: boolean; message: string }>

  /* market data  */
  currentSharePrice: number
  lastPriceUpdate: string | null

  /* ui state */
  loading: boolean
  error: string | null
  refreshOrders: () => Promise<void>
}

/* ---------- Context ---------- */
const ExchangeContext = createContext<ExchangeContextType | undefined>(undefined)

/* ---------- Provider ---------- */
export function ExchangeProvider({ children }: { children: React.ReactNode }) {
  const [marketSellOrders, setMarketSellOrders] = useState<SellOrder[]>([])
  const [marketBuyOrders, setMarketBuyOrders] = useState<BuyOrder[]>([])
  const [userSellOrders, setUserSellOrders] = useState<SellOrder[]>([])
  const [userBuyOrders, setUserBuyOrders] = useState<BuyOrder[]>([])

  const [currentSharePrice, setCurrentSharePrice] = useState(100)
  const [lastPriceUpdate, setLastPriceUpdate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const { user, session } = useAuth()
  const { buyWalletBalance, holdWalletPostHold, refreshWalletBalances } = useWallet()

  /* ---------- queries ---------- */
  const fetchSharePrice = async (silent = true) => {
    try {
      const { data, error } = await supabase
        .from("current_pricing_info")
        .select("current_price, week_start, latest_hodl_date")
        .order("week_start", { ascending: false })
        .limit(1)

      if (error) {
        if (!silent) console.error("Error fetching price from current_pricing_info:", error)
        const rpcResult = await supabase.rpc("get_current_share_price")
        if (rpcResult.data) {
          setCurrentSharePrice(Number(rpcResult.data))
        }
        return
      }

      if (data && data.length > 0) {
        const latestPrice = data[0]
        setCurrentSharePrice(Number(latestPrice.current_price) || 100)
        setLastPriceUpdate(latestPrice.latest_hodl_date || latestPrice.week_start)
        if (!silent) {
          console.log("📈 Current share price:", latestPrice.current_price, "week:", latestPrice.week_start)
        }
      } else {
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

  const refreshOrders = async (silent = true) => {
    if (!user || !session) {
      if (!isInitialized) {
        setLoading(false)
      }
      return
    }

    try {
      if (!isInitialized) {
        setLoading(true)
      }

      if (!silent) {
        setError(null)
      }

      // GLOBAL MARKET ORDERS - Show pending/partial buy orders and available/partial sell orders
      const [marketSellResult, marketBuyResult] = await Promise.all([
        supabase
          .from("sell_orders")
          .select("*")
          .in("status", ["available", "partial"]) // Show available and partial sell orders
          .order("created_at", { ascending: true }),
        supabase
          .from("buy_orders")
          .select("*")
          .in("status", ["pending", "partial"]) // Show pending and partial buy orders
          .order("created_at", { ascending: true }),
      ])

      // USER-SPECIFIC orders - Show ALL orders including completed ones
      const [userSellResult, userBuyResult] = await Promise.all([
        supabase.from("sell_orders").select("*").eq("user_uuid", user.id).order("created_at", { ascending: false }),
        supabase.from("buy_orders").select("*").eq("user_uuid", user.id).order("created_at", { ascending: false }),
      ])

      const safeNumber = (value: any): number => {
        const num = Number(value)
        return isNaN(num) ? 0 : num
      }

      const getCorrectStatus = (order: any, isBuyOrder = true) => {
        let fillPercentage = 0

        if (isBuyOrder) {
          const totalAmount = safeNumber(order.total_amount)
          const filledAmount = safeNumber(order.amount_filled)
          fillPercentage = totalAmount > 0 ? (filledAmount / totalAmount) * 100 : 0
        } else {
          const totalShares = safeNumber(order.shares_available)
          const remainingShares = safeNumber(order.shares_remaining)
          const filledShares = totalShares - remainingShares
          fillPercentage = totalShares > 0 ? (filledShares / totalShares) * 100 : 0
        }

        // Use correct status mapping for fractional matching
        if (fillPercentage === 0) {
          return isBuyOrder ? "pending" : "available"
        } else if (fillPercentage > 0 && fillPercentage < 100) {
          return "partial"
        } else if (fillPercentage >= 100) {
          return "matched"
        }

        return order.status
      }

      const formatOrderData = (orders: any[], isUserOrder = false, isBuyOrder = true) => {
        return orders.map((order: any) => {
          const correctedStatus = getCorrectStatus(order, isBuyOrder)

          // Calculate shares for buy orders
          let sharesRequested = 0
          let sharesFilled = 0

          if (isBuyOrder) {
            const totalAmount = safeNumber(order.total_amount)
            const filledAmount = safeNumber(order.amount_filled)
            const pricePerShare = safeNumber(order.price_per_share)

            if (pricePerShare > 0) {
              sharesRequested = totalAmount / pricePerShare
              sharesFilled = filledAmount / pricePerShare
            }
          }

          return {
            ...order,
            total_amount: safeNumber(order.total_amount),
            price_per_share: safeNumber(order.price_per_share),
            shares: safeNumber(order.shares_available),
            shares_available: safeNumber(order.shares_available),
            shares_requested: isBuyOrder ? sharesRequested : safeNumber(order.shares_requested),
            shares_filled: isBuyOrder ? sharesFilled : safeNumber(order.shares_filled),
            shares_remaining: safeNumber(order.shares_remaining),
            filled_shares: safeNumber(order.shares_available) - safeNumber(order.shares_remaining),
            amount_filled: safeNumber(order.amount_filled),
            status: correctedStatus,
          }
        })
      }

      const formattedMarketSellOrders = formatOrderData(marketSellResult.data || [], false, false)
      const formattedMarketBuyOrders = formatOrderData(marketBuyResult.data || [], false, true)
      const formattedUserSellOrders = formatOrderData(userSellResult.data || [], true, false)
      const formattedUserBuyOrders = formatOrderData(userBuyResult.data || [], true, true)

      setMarketSellOrders(formattedMarketSellOrders)
      setMarketBuyOrders(formattedMarketBuyOrders)
      setUserSellOrders(formattedUserSellOrders)
      setUserBuyOrders(formattedUserBuyOrders)

      if (!silent) {
        console.log("✅ Orders refreshed successfully")
        console.log("Market Buy Orders:", formattedMarketBuyOrders.length)
        console.log("Market Sell Orders:", formattedMarketSellOrders.length)
        console.log("User Buy Orders:", formattedUserBuyOrders.length)
        console.log("User Sell Orders:", formattedUserSellOrders.length)
      }

      if (!isInitialized) {
        setIsInitialized(true)
      }
    } catch (err: any) {
      if (!silent) {
        console.error("❌ Refresh orders error", err)
        setError(err.message)
      }
    } finally {
      if (!isInitialized) {
        setLoading(false)
      }
    }
  }

  /* ---------- actions ---------- */
  const placeBuyOrder = useCallback(
    async (amount: number) => {
      if (!user) return { success: false, message: "Not authenticated" }
      if (amount <= 0) return { success: false, message: "Invalid amount" }
      if (amount < 50) return { success: false, message: "Minimum purchase is N$50" }
      if (amount > buyWalletBalance) return { success: false, message: "Insufficient Buy-wallet funds" }

      try {
        console.log("📤 Placing buy order:", { amount, currentSharePrice, user_id: user.id })

        const { data, error } = await supabase.rpc("place_buy_order", {
          p_user_uuid: user.id,
          p_total_amount: amount,
          p_price_per_share: currentSharePrice,
        })

        console.log("📥 Buy order result:", { data, error })

        if (error) {
          throw error
        }

        const result = typeof data === "string" ? JSON.parse(data) : data

        if (!result.success) {
          throw new Error(result.message)
        }

        // Silent background refresh - user won't see loading states
        await Promise.all([refreshOrders(true), refreshWalletBalances(true)])

        const expectedShares = (amount / currentSharePrice).toFixed(4)
        return {
          success: true,
          message: result.message || `Buy order placed for ${expectedShares} shares.`,
        }
      } catch (e: any) {
        console.error("❌ Buy order error", e)
        return { success: false, message: e.message }
      }
    },
    [user, currentSharePrice, buyWalletBalance, refreshWalletBalances],
  )

  const placeSellOrder = useCallback(
    async (shares: number) => {
      if (!user) return { success: false, message: "Not authenticated" }
      if (shares <= 0) return { success: false, message: "Invalid amount" }
      if (shares < 0.5) return { success: false, message: "Minimum sell is 0.5 shares" }
      if (shares > holdWalletPostHold) return { success: false, message: "Insufficient Post-hold shares" }

      try {
        console.log("📤 Placing sell order:", { shares, currentSharePrice, user_id: user.id })

        const { data, error } = await supabase.rpc("place_sell_order", {
          p_user_uuid: user.id,
          p_shares: shares,
          p_price_per_share: currentSharePrice,
        })

        console.log("📥 Sell order result:", { data, error })

        if (error) {
          throw error
        }

        const result = typeof data === "string" ? JSON.parse(data) : data

        if (!result.success) {
          throw new Error(result.message)
        }

        console.log("🔄 Triggering order matching...")
        const matchResult = await supabase.rpc("match_orders")
        console.log("🔄 Match result:", matchResult)

        // Silent background refresh - user won't see loading states
        await Promise.all([refreshOrders(true), refreshWalletBalances(true)])

        return {
          success: true,
          message: result.message || `Sell order placed for ${shares.toFixed(4)} shares`,
        }
      } catch (e: any) {
        console.error("❌ Sell order error", e)
        return { success: false, message: e.message }
      }
    },
    [user, currentSharePrice, holdWalletPostHold, refreshWalletBalances],
  )

  const cancelSellOrder = useCallback(
    async (orderId: string) => {
      if (!user) return { success: false, message: "Not authenticated" }

      try {
        console.log("🚫 Cancelling sell order:", orderId)

        const { data, error } = await supabase.rpc("cancel_sell_order", {
          p_order_id: orderId,
          p_user_uuid: user.id,
        })

        console.log("📥 Cancel order result:", { data, error })

        if (error) {
          throw error
        }

        // Silent background refresh - user won't see loading states
        await Promise.all([refreshOrders(true), refreshWalletBalances(true)])

        return {
          success: true,
          message: "Sell order cancelled successfully. Remaining shares returned to your wallet.",
        }
      } catch (e: any) {
        console.error("❌ Cancel order error", e)
        return { success: false, message: e.message }
      }
    },
    [user, refreshWalletBalances],
  )

  /* ---------- Background polling setup ---------- */
  useEffect(() => {
    if (!user || !session) return

    const initialLoad = async () => {
      await Promise.all([fetchSharePrice(false), refreshOrders(false)])
    }

    initialLoad()

    // More frequent background updates for better UX with fractional matching
    const ordersInterval = setInterval(() => {
      refreshOrders(true) // Always silent
    }, 5000) // Every 5 seconds

    const priceInterval = setInterval(() => {
      fetchSharePrice(true) // Always silent
    }, 30000) // Every 30 seconds

    return () => {
      clearInterval(ordersInterval)
      clearInterval(priceInterval)
    }
  }, [user, session])

  /* ---------- context value ---------- */
  const ctx: ExchangeContextType = {
    marketSellOrders,
    marketBuyOrders,
    userSellOrders,
    userBuyOrders,
    placeBuyOrder,
    placeSellOrder,
    cancelSellOrder,
    currentSharePrice,
    lastPriceUpdate,
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
