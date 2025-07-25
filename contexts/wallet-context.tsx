"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

interface WalletContextType {
  // Wallet balances
  buyWalletBalance: number
  holdWalletPreHold: number
  holdWalletPostHold: number
  cashoutWalletBalance: number
  aftBalance: number

  // Loading states
  loading: boolean
  error: string | null

  // Actions
  refreshWalletBalances: (silent?: boolean) => Promise<void>
  updateBuyWallet: (amount: number, operation: "add" | "subtract") => Promise<void>
  updateHoldWallet: (shares: number, operation: "add" | "subtract", type: "pre" | "post") => Promise<void>
  updateCashoutWallet: (amount: number, operation: "add" | "subtract") => Promise<void>
  updateAftBalance: (amount: number, operation: "add" | "subtract") => Promise<void>

  // Alias for backward compatibility
  refreshBalances: (silent?: boolean) => Promise<void>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  // Wallet balances
  const [buyWalletBalance, setBuyWalletBalance] = useState(0)
  const [holdWalletPreHold, setHoldWalletPreHold] = useState(0)
  const [holdWalletPostHold, setHoldWalletPostHold] = useState(0)
  const [cashoutWalletBalance, setCashoutWalletBalance] = useState(0)
  const [aftBalance, setAftBalance] = useState(0)

  // UI states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshWalletBalances = useCallback(
    async (silent = false) => {
      if (!user) return

      try {
        if (!silent) {
          setLoading(true)
          setError(null)
        }

        if (!silent) {
          console.log("🔄 Refreshing wallet balances...")
        }

        // Fetch user shares data
        const { data: sharesData, error: sharesError } = await supabase
          .from("user_shares")
          .select("wallet_type, shares")
          .eq("user_uuid", user.id)

        if (sharesError) {
          console.error("Error fetching user shares:", sharesError)
          throw sharesError
        }

        // Process shares data
        let buyWallet = 0
        let holdPreShares = 0
        let holdPostShares = 0
        let cashoutWallet = 0
        let aft = 0

        if (sharesData) {
          sharesData.forEach((item: any) => {
            const shares = Number(item.shares) || 0
            switch (item.wallet_type) {
              case "buy_wallet":
                buyWallet += shares
                break
              case "hold_pre":
                holdPreShares += shares
                break
              case "hold_post":
                holdPostShares += shares
                break
              case "cashout_wallet":
                cashoutWallet += shares
                break
              case "aft_balance":
                aft += shares
                break
              default:
                if (!silent) {
                  console.warn("Unknown wallet type:", item.wallet_type)
                }
            }
          })
        }

        // Update state
        setBuyWalletBalance(buyWallet)
        setHoldWalletPreHold(holdPreShares)
        setHoldWalletPostHold(holdPostShares)
        setCashoutWalletBalance(cashoutWallet)
        setAftBalance(aft)

        if (!silent) {
          console.log("✅ Wallet balances updated:", {
            buyWallet: buyWallet.toFixed(4),
            holdPre: holdPreShares.toFixed(4),
            holdPost: holdPostShares.toFixed(4),
            cashout: cashoutWallet.toFixed(4),
            aft: aft.toFixed(4),
          })
        }
      } catch (err: any) {
        if (!silent) {
          console.error("❌ Error refreshing wallet balances:", err)
          setError(err.message || "Failed to refresh wallet balances")
        }
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    },
    [user],
  )

  // Update buy wallet (optimistic UI update)
  const updateBuyWallet = async (amount: number, operation: "add" | "subtract") => {
    const newBalance = operation === "add" ? buyWalletBalance + amount : buyWalletBalance - amount
    setBuyWalletBalance(Math.max(0, newBalance)) // Prevent negative balances
    console.log(
      `💰 ${operation === "add" ? "Added" : "Subtracted"} N$${amount} ${operation === "add" ? "to" : "from"} buy wallet. New balance: N$${newBalance.toFixed(2)}`,
    )
  }

  // Update hold wallet (optimistic UI update)
  const updateHoldWallet = async (shares: number, operation: "add" | "subtract", type: "pre" | "post") => {
    if (type === "pre") {
      const newBalance = operation === "add" ? holdWalletPreHold + shares : holdWalletPreHold - shares
      setHoldWalletPreHold(Math.max(0, newBalance))
      console.log(
        `📈 ${operation === "add" ? "Added" : "Subtracted"} ${shares} shares ${operation === "add" ? "to" : "from"} pre-hold wallet. New balance: ${newBalance.toFixed(4)}`,
      )
    } else {
      const newBalance = operation === "add" ? holdWalletPostHold + shares : holdWalletPostHold - shares
      setHoldWalletPostHold(Math.max(0, newBalance))
      console.log(
        `📈 ${operation === "add" ? "Added" : "Subtracted"} ${shares} shares ${operation === "add" ? "to" : "from"} post-hold wallet. New balance: ${newBalance.toFixed(4)}`,
      )
    }
  }

  // Update cashout wallet (optimistic UI update)
  const updateCashoutWallet = async (amount: number, operation: "add" | "subtract") => {
    const newBalance = operation === "add" ? cashoutWalletBalance + amount : cashoutWalletBalance - amount
    setCashoutWalletBalance(Math.max(0, newBalance))
    console.log(
      `💸 ${operation === "add" ? "Added" : "Subtracted"} N$${amount} ${operation === "add" ? "to" : "from"} cashout wallet. New balance: N$${newBalance.toFixed(2)}`,
    )
  }

  // Update AFT balance (optimistic UI update)
  const updateAftBalance = async (amount: number, operation: "add" | "subtract") => {
    const newBalance = operation === "add" ? aftBalance + amount : aftBalance - amount
    setAftBalance(Math.max(0, newBalance))
    console.log(
      `🎯 ${operation === "add" ? "Added" : "Subtracted"} ${amount} AFT ${operation === "add" ? "to" : "from"} AFT balance. New balance: ${newBalance.toFixed(4)}`,
    )
  }

  // Load wallet balances when user changes
  useEffect(() => {
    if (user) {
      refreshWalletBalances()
    }
  }, [user, refreshWalletBalances])

  // Set up real-time subscriptions for wallet changes
  useEffect(() => {
    if (!user) return

    console.log("🔔 Setting up wallet real-time subscriptions")

    const subscription = supabase
      .channel("user_shares_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_shares",
          filter: `user_uuid=eq.${user.id}`,
        },
        (payload) => {
          console.log("📡 Wallet change detected:", payload)
          refreshWalletBalances(true) // Silent refresh
        },
      )
      .subscribe()

    return () => {
      console.log("🔕 Cleaning up wallet subscriptions")
      subscription.unsubscribe()
    }
  }, [user, refreshWalletBalances])

  const value = {
    // Balances
    buyWalletBalance,
    holdWalletPreHold,
    holdWalletPostHold,
    cashoutWalletBalance,
    aftBalance,

    // States
    loading,
    error,

    // Actions
    refreshWalletBalances,
    updateBuyWallet,
    updateHoldWallet,
    updateCashoutWallet,
    updateAftBalance,

    // Alias for backward compatibility
    refreshBalances: refreshWalletBalances,
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}
