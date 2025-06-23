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
  /* orders */
  sellOrders: SellOrder[]
  buyOrders: BuyOrder[]
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
  const [sellOrders, setSellOrders] = useState<SellOrder[]>([])
  const [buyOrders, setBuyOrders] = useState<BuyOrder[]>([])
  const [currentSharePrice, setCurrentSharePrice] = useState(100)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { user, session } = useAuth()
  const { buyWalletBalance, holdWalletPostHold, refreshBalances: refreshWalletBalances } = useWallet()

  /* computed helpers */
  const userSellOrders = sellOrders.filter((o) => o.user_uuid === user?.id)
  const userBuyOrders = buyOrders.filter((o) => o.user_uuid === user?.id)

  /* ---------- queries ---------- */
  const fetchSharePrice = async () => {
    try {
      const { data, error } = await supabase.rpc("get_current_share_price")
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

      // Try both table names and both status values
      const [sellResult1, sellResult2, buyResult] = await Promise.all([
        // Try active_sell_orders table first
        supabase
          .from("active_sell_orders")
          .select("*")
          .order("created_at", { ascending: true })
          .then((r) => ({ ...r, source: "active_sell_orders" })),
        // Try sell_orders with 'available' status
        supabase
          .from("sell_orders")
          .select("*")
          .eq("status", "available")
          .order("created_at", { ascending: true })
          .then((r) => ({ ...r, source: "sell_orders" })),
        // Buy orders
        supabase
          .from("buy_orders")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: true }),
      ])

      console.log("Query results:", {
        active_sell_orders: sellResult1.data?.length || 0,
        sell_orders_available: sellResult2.data?.length || 0,
        sellResult1_error: sellResult1.error?.message,
        sellResult2_error: sellResult2.error?.message,
      })

      // Use whichever query worked and has data
      let sellData = null
      if (sellResult1.data && sellResult1.data.length > 0) {
        sellData = sellResult1.data
        console.log("Using active_sell_orders table")
      } else if (sellResult2.data && sellResult2.data.length > 0) {
        sellData = sellResult2.data
        console.log("Using sell_orders table")
      } else {
        // If both failed, try sell_orders without status filter to see what's there
        const { data: allSellOrders } = await supabase
          .from("sell_orders")
          .select("*")
          .order("created_at", { ascending: true })
        console.log("All sell orders (any status):", allSellOrders)
        sellData = allSellOrders || []
      }

      /* map DB rows to strict types */
      const mappedSell = (sellData || []).map((r: any) => ({
        id: r.id,
        user_uuid: r.user_uuid,
        shares: r.shares_available || r.shares || 0,
        price_per_share: r.price_per_share || 0,
        status: r.status || "available",
        created_at: r.created_at,
        filled_shares: (r.shares_available || r.shares || 0) - (r.shares_remaining || 0),
        shares_remaining: r.shares_remaining || 0,
      }))

      const mappedBuy = (buyResult.data || []).map((r: any) => ({
        id: r.id,
        user_uuid: r.user_uuid,
        total_amount: r.total_amount,
        price_per_share: r.price_per_share,
        status: r.status,
        created_at: r.created_at,
        filled_amount: r.amount_filled || 0,
      }))

      setSellOrders(mappedSell)
      setBuyOrders(mappedBuy)
      console.log("Orders refreshed:", {
        sellOrders: mappedSell.length,
        buyOrders: mappedBuy.length,
      })
    } catch (err: any) {
      console.error("Refresh orders error", err)
      setError(err.message)
    } finally {
      setLoading(false)
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
        setLoading(true)

        console.log("Placing buy order:", { amount, currentSharePrice, user_id: user.id })

        const { data, error } = await supabase.rpc("place_buy_order", {
          p_user_uuid: user.id,
          p_total_amount: amount,
        })

        console.log("Buy order result:", { data, error })

        if (error) throw error

        await Promise.all([refreshOrders(), refreshWalletBalances()])
        return {
          success: true,
          message: `Queued buy order for ${(amount / currentSharePrice).toFixed(2)} shares`,
        }
      } catch (e: any) {
        console.error("Buy order error", e)
        return { success: false, message: e.message }
      } finally {
        setLoading(false)
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
        setLoading(true)

        console.log("Placing sell order:", { shares, currentSharePrice, user_id: user.id, holdWalletPostHold })

        const { data, error } = await supabase.rpc("place_sell_order", {
          p_user_uuid: user.id,
          p_price_per_share: currentSharePrice,
          p_shares: shares,
        })

        console.log("Sell order result:", { data, error })

        if (error) throw error

        // Wait a moment for the database to update
        await new Promise((resolve) => setTimeout(resolve, 1000))

        await Promise.all([refreshOrders(), refreshWalletBalances()])
        return {
          success: true,
          message: `Queued sell order for ${shares} shares`,
        }
      } catch (e: any) {
        console.error("Sell order error", e)
        return { success: false, message: e.message }
      } finally {
        setLoading(false)
      }
    },
    [user, currentSharePrice, holdWalletPostHold, refreshWalletBalances],
  )

  /* ---------- lifecycle ---------- */
  useEffect(() => {
    fetchSharePrice()
    refreshOrders()
  }, [user, session])

  /* ---------- context value ---------- */
  const ctx: ExchangeContextType = {
    sellOrders,
    buyOrders,
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
