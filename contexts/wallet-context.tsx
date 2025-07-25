"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

// Wallet types that match the database schema
const VALID_WALLET_TYPES = new Set([
  "buy_wallet",
  "cashout_wallet",
  "hold_wallet_pre_hold",
  "hold_wallet_post_hold",
  "vesting_locked",
])

interface WalletContextType {
  // Wallet balances
  buyWallet: number
  cashoutWallet: number
  holdWalletPreHold: number
  holdWalletPostHold: number
  vestingLocked: number

  // Actions
  refreshBalances: () => Promise<void>

  // Utilities
  formatCurrency: (amount: number) => string
  formatShares: (shares: number) => string

  // State
  loading: boolean
  error: string | null
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

// Utility function to format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-NA", {
    style: "currency",
    currency: "NAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Utility function to format shares with exactly 4 decimal places
export const formatShares = (shares: number): string => {
  return shares.toFixed(4)
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  const [buyWallet, setBuyWallet] = useState(0)
  const [cashoutWallet, setCashoutWallet] = useState(0)
  const [holdWalletPreHold, setHoldWalletPreHold] = useState(0)
  const [holdWalletPostHold, setHoldWalletPostHold] = useState(0)
  const [vestingLocked, setVestingLocked] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshBalances = async () => {
    if (!user) {
      console.log("❌ No user found, skipping balance refresh")
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Refreshing wallet balances for user:", user.id)

      const { data, error: fetchError } = await supabase
        .from("user_shares")
        .select("*")
        .eq("user_uuid", user.id)
        .single()

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          // No row found - user doesn't have wallet entries yet
          console.log("⚠️ No wallet data found for user, initializing with zeros")
          setBuyWallet(0)
          setCashoutWallet(0)
          setHoldWalletPreHold(0)
          setHoldWalletPostHold(0)
          setVestingLocked(0)
          return
        }
        throw fetchError
      }

      console.log("📊 Raw wallet data from database:", data)

      // Update state with the fetched data, ensuring all values are numbers
      setBuyWallet(Number(data?.buy_wallet) || 0)
      setCashoutWallet(Number(data?.cashout_wallet) || 0)
      setHoldWalletPreHold(Number(data?.hold_wallet_pre_hold) || 0)
      setHoldWalletPostHold(Number(data?.hold_wallet_post_hold) || 0)
      setVestingLocked(Number(data?.vesting_locked) || 0)

      console.log("✅ Wallet balances updated:", {
        buyWallet: Number(data?.buy_wallet) || 0,
        cashoutWallet: Number(data?.cashout_wallet) || 0,
        holdWalletPreHold: Number(data?.hold_wallet_pre_hold) || 0,
        holdWalletPostHold: Number(data?.hold_wallet_post_hold) || 0,
        vestingLocked: Number(data?.vesting_locked) || 0,
      })
    } catch (err: any) {
      console.error("❌ Error fetching wallet balances:", err)
      setError(err.message || "Failed to fetch wallet balances")
    } finally {
      setLoading(false)
    }
  }

  // Load balances when user changes
  useEffect(() => {
    if (user) {
      refreshBalances()
    } else {
      // Reset balances when user logs out
      setBuyWallet(0)
      setCashoutWallet(0)
      setHoldWalletPreHold(0)
      setHoldWalletPostHold(0)
      setVestingLocked(0)
    }
  }, [user])

  // Set up real-time subscription for balance changes
  useEffect(() => {
    if (!user) return

    console.log("🔔 Setting up real-time subscription for wallet balances")

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
          console.log("📡 Wallet balance change detected:", payload)
          refreshBalances()
        },
      )
      .subscribe()

    return () => {
      console.log("🔕 Cleaning up wallet subscription")
      subscription.unsubscribe()
    }
  }, [user])

  const value = {
    buyWallet,
    cashoutWallet,
    holdWalletPreHold,
    holdWalletPostHold,
    vestingLocked,
    refreshBalances,
    formatCurrency,
    formatShares,
    loading,
    error,
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
