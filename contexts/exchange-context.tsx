"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import { useWallet } from "@/contexts/wallet-context"

export interface SellOrder {
  id: string
  user_uuid: string
  shares: number
  price_per_share: number
  status: "active" | "filled" | "expired" | "queued"
  created_at: string
  filled_shares: number
}

export interface BuyOrder {
  id: string
  user_uuid: string
  total_amount: number
  price_per_share: number
  status: "active" | "filled" | "expired" | "queued"
  created_at: string
  filled_amount: number
}

interface ExchangeContextType {
  // Orders
  sellOrders: SellOrder[]
  buyOrders: BuyOrder[]
  userSellOrders: SellOrder[]
  userBuyOrders: BuyOrder[]

  // Actions
  placeBuyOrder: (amount: number) => Promise<{ success: boolean; message: string }>
  placeSellOrder: (shares: number) => Promise<{ success: boolean; message: string }>

  // Market data
  currentSharePrice: number

  // Loading states
  loading: boolean
  error: string | null
  refreshOrders: () => Promise<void>
}

const ExchangeContext = createContext<ExchangeContextType | undefined>(undefined)

export function ExchangeProvider({ children }: { children: React.ReactNode }) {
  const [sellOrders, setSellOrders] = useState<SellOrder[]>([])
  const [buyOrders, setBuyOrders] = useState<BuyOrder[]>([])
  const [currentSharePrice, setCurrentSharePrice] = useState(108.2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { user, session } = useAuth()
  const { buyWalletBalance, holdWalletPostHold, updateBuyWallet, updateHoldWallet } = useWallet()

  // Filter orders for current user
  const userSellOrders = sellOrders.filter((order) => order.user_uuid === user?.id)
  const userBuyOrders = buyOrders.filter((order) => order.user_uuid === user?.id)

  // Fetch current share price from Supabase
  const fetchSharePrice = async () => {
    try {
      const { data, error } = await supabase.rpc("get_current_share_price")
      if (error) throw error
      setCurrentSharePrice(Number(data) || 108.2)
    } catch (err) {
      console.error("Error fetching share price:", err)
      setCurrentSharePrice(108.2) // Fallback
    }
  }

  // Fetch all orders from Supabase
  const refreshOrders = async () => {
    if (!user || !session) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch sell orders
      const { data: sellData, error: sellError } = await supabase
        .from("sell_orders")
        .select("*")
        .in("status", ["active", "queued"])
        .order("created_at", { ascending: true })

      if (sellError) throw sellError

      // Fetch buy orders
      const { data: buyData, error: buyError } = await supabase
        .from("buy_orders")
        .select("*")
        .in("status", ["active", "queued"])
        .order("created_at", { ascending: true })

      if (buyError) throw buyError

      setSellOrders(sellData || [])
      setBuyOrders(buyData || [])

      console.log("Orders refreshed:", { sellOrders: sellData?.length || 0, buyOrders: buyData?.length || 0 })
    } catch (err: any) {
      console.error("Error fetching orders:", err)
      setError(err.message || "Failed to load orders")
    } finally {
      setLoading(false)
    }
  }

  // Load data when user changes
  useEffect(() => {
    fetchSharePrice()
    refreshOrders()
  }, [user, session])

  const placeBuyOrder = useCallback(
    async (amount: number): Promise<{ success: boolean; message: string }> => {
      if (!user) return { success: false, message: "User not authenticated" }

      setLoading(true)

      try {
        // Validate amount
        if (amount <= 0) {
          return { success: false, message: "Amount must be greater than 0" }
        }

        if (amount > buyWalletBalance) {
          return { success: false, message: "Insufficient funds in Buy Wallet" }
        }

        // Calculate shares that can be bought
        const sharesPossible = Math.floor(amount / currentSharePrice)
        const actualAmount = sharesPossible * currentSharePrice

        if (sharesPossible === 0) {
          return { success: false, message: `Minimum purchase is N$${currentSharePrice} (1 share)` }
        }

        // Place buy order in Supabase
        const { data, error } = await supabase.rpc("place_buy_order", {
          p_user_uuid: user.id,
          p_total_amount: actualAmount,
          p_price_per_share: currentSharePrice,
        })

        if (error) throw error

        // Refresh orders and wallet
        await refreshOrders()
        await updateBuyWallet(actualAmount, "subtract")

        return {
          success: true,
          message: `Buy order placed for ${sharesPossible} shares at N$${currentSharePrice} each`,
        }
      } catch (error: any) {
        console.error("Error placing buy order:", error)
        return { success: false, message: error.message || "Failed to place buy order" }
      } finally {
        setLoading(false)
      }
    },
    [user, buyWalletBalance, currentSharePrice, updateBuyWallet],
  )

  const placeSellOrder = useCallback(
    async (shares: number): Promise<{ success: boolean; message: string }> => {
      if (!user) return { success: false, message: "User not authenticated" }

      setLoading(true)

      try {
        // Validate shares
        if (shares <= 0) {
          return { success: false, message: "Shares must be greater than 0" }
        }

        if (shares > holdWalletPostHold) {
          return { success: false, message: "Insufficient shares in Post-Hold wallet" }
        }

        // Place sell order in Supabase
        const { data, error } = await supabase.rpc("place_sell_order", {
          p_user_uuid: user.id,
          p_shares: shares,
          p_price_per_share: currentSharePrice,
        })

        if (error) throw error

        // Refresh orders and wallet
        await refreshOrders()
        await updateHoldWallet(shares, "subtract", "post")

        return {
          success: true,
          message: `Sell order placed for ${shares} shares at N$${currentSharePrice} each`,
        }
      } catch (error: any) {
        console.error("Error placing sell order:", error)
        return { success: false, message: error.message || "Failed to place sell order" }
      } finally {
        setLoading(false)
      }
    },
    [user, holdWalletPostHold, currentSharePrice, updateHoldWallet],
  )

  const value: ExchangeContextType = {
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

  return <ExchangeContext.Provider value={value}>{children}</ExchangeContext.Provider>
}

export function useExchange() {
  const context = useContext(ExchangeContext)
  if (context === undefined) {
    throw new Error("useExchange must be used within an ExchangeProvider")
  }
  return context
}
