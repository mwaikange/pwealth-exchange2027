"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

// Define valid wallet types based on the actual database constraint
type ValidWalletType = "buy_wallet" | "hold_wallet_pre_hold" | "hold_wallet_post_hold" | "cashout_wallet"

const VALID_WALLET_TYPES = new Set<ValidWalletType>([
  "buy_wallet",
  "hold_wallet_pre_hold",
  "hold_wallet_post_hold",
  "cashout_wallet",
])

// Define the shape of our wallet state (real data from Supabase)
type WalletState = {
  buyWalletBalance: number // NAD in buy_wallet
  holdWalletPreHold: number // Shares in hold_wallet_pre_hold
  holdWalletPostHold: number // Shares in hold_wallet_post_hold
  cashoutWalletBalance: number // NAD in cashout_wallet
  aftBalance: number // Activation fee balance (if still used)
}

// Define the context type with state and update functions
type WalletContextType = WalletState & {
  // Update functions
  updateBuyWallet: (amount: number, operation: "add" | "subtract") => Promise<void>
  updateHoldWallet: (amount: number, operation: "add" | "subtract", walletType: "pre" | "post") => Promise<void>
  updateCashoutWallet: (amount: number, operation: "add" | "subtract") => Promise<void>

  // Convenience methods
  topUpBuyWallet: (amount: number) => Promise<void>
  transferToHold: (amount: number, fromType: "pre" | "post", toType: "pre" | "post") => Promise<void>
  transferToCashout: (amount: number) => Promise<void>

  // Calculated values
  getTotalAccountValue: () => number
  getCurrentSharePrice: () => Promise<number>

  refreshBalances: (silent?: boolean) => Promise<void>
  refreshWalletBalances: (silent?: boolean) => Promise<void>
  loading: boolean
  error: string | null
}

// Create the context with default values
const WalletContext = createContext<WalletContextType | undefined>(undefined)

// Safe number formatting functions
const safeNumber = (value: any): number => {
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

const formatCurrency = (value: any): string => {
  const num = safeNumber(value)
  return `N$${num.toFixed(2)}`
}

const formatShares = (value: any): string => {
  const num = safeNumber(value)
  return num.toFixed(4) // Ensure 4 decimal places, no trailing zero removal
}

// Provider component
export function WalletProvider({ children }: { children: React.ReactNode }) {
  // State for wallet balances (real data from Supabase)
  const [walletState, setWalletState] = useState<WalletState>({
    buyWalletBalance: 0,
    holdWalletPreHold: 0,
    holdWalletPostHold: 0,
    cashoutWalletBalance: 0,
    aftBalance: 0,
  })
  const [loading, setLoading] = useState(true) // Only true on initial load
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false) // Track if we've loaded data once
  const { user, session } = useAuth()

  // Fetch wallet balances from Supabase
  const refreshBalances = async (silent = false) => {
    if (!user || !session) {
      if (!isInitialized) {
        setLoading(false)
      }
      return
    }

    try {
      // Only show loading on initial load, not on background refreshes
      if (!isInitialized && !silent) {
        setLoading(true)
      }

      if (!silent) {
        setError(null)
      }

      // Fetch user wallet balances from user_shares table
      const { data: walletData, error: walletError } = await supabase
        .from("user_shares")
        .select("wallet_type, shares")
        .eq("user_uuid", user.id)

      if (walletError) {
        console.error("Wallet fetch error:", walletError)
        throw new Error(`Failed to fetch wallet data: ${walletError.message}`)
      }

      if (!silent) {
        console.log("Raw wallet data from user_shares:", walletData)
      }

      // Process wallet data
      const wallets = walletData || []
      const newState: WalletState = {
        buyWalletBalance: 0,
        holdWalletPreHold: 0,
        holdWalletPostHold: 0,
        cashoutWalletBalance: 0,
        aftBalance: 0,
      }

      wallets.forEach((wallet) => {
        const shares = safeNumber(wallet.shares)
        if (!silent) {
          console.log(`Processing wallet: ${wallet.wallet_type} = ${shares}`)
        }

        switch (wallet.wallet_type) {
          case "buy_wallet":
            newState.buyWalletBalance = shares
            break
          case "hold_wallet_pre_hold":
            newState.holdWalletPreHold = shares
            break
          case "hold_wallet_post_hold":
            newState.holdWalletPostHold = shares
            break
          case "cashout_wallet":
            newState.cashoutWalletBalance = shares
            break
          default:
            if (!silent) {
              console.warn(`Unknown wallet type: ${wallet.wallet_type}`)
            }
        }
      })

      // Set AFT balance to 0 since we're not using legacy wallets
      newState.aftBalance = 0

      setWalletState(newState)

      if (!silent) {
        console.log("Final wallet state:", newState)
      }

      // Mark as initialized after first successful load
      if (!isInitialized) {
        setIsInitialized(true)
      }
    } catch (err: any) {
      if (!silent) {
        console.error("Error fetching wallet balances:", err)
        setError(err.message || "Failed to load wallet data")
      }
    } finally {
      // Only set loading to false if this was the initial load
      if (!isInitialized) {
        setLoading(false)
      }
    }
  }

  // Alias for refreshBalances to match the interface
  const refreshWalletBalances = refreshBalances

  // Load balances when user changes and set up background polling
  useEffect(() => {
    if (!user || !session) return

    // Initial load (with loading state)
    refreshBalances(false)

    // Set up background polling for wallet balances (silent updates)
    const walletInterval = setInterval(() => {
      refreshBalances(true) // Silent background refresh
    }, 15000) // Every 15 seconds

    return () => {
      clearInterval(walletInterval)
    }
  }, [user, session])

  // Get current share price from Supabase
  const getCurrentSharePrice = async (): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc("get_current_share_price")
      if (error) throw error
      return safeNumber(data) || 108.2 // Fallback to current price
    } catch (err) {
      console.error("Error fetching share price:", err)
      return 108.2 // Fallback price
    }
  }

  // Helper function to update wallet balance directly
  const updateWalletBalance = async (walletType: ValidWalletType, amount: number, operation: "add" | "subtract") => {
    if (!user) return

    try {
      // Validate wallet type
      if (!VALID_WALLET_TYPES.has(walletType)) {
        throw new Error(`Invalid wallet type: ${walletType}`)
      }

      const changeAmount = operation === "add" ? amount : -amount

      // First, get current balance
      const { data: currentData, error: fetchError } = await supabase
        .from("user_shares")
        .select("shares")
        .eq("user_uuid", user.id)
        .eq("wallet_type", walletType)
        .single()

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 is "not found" error, which is okay
        throw fetchError
      }

      const currentBalance = safeNumber(currentData?.shares) || 0
      const newBalance = Math.max(0, currentBalance + changeAmount) // Don't allow negative balances

      if (currentData) {
        // Update existing row
        const { error: updateError } = await supabase
          .from("user_shares")
          .update({
            shares: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("user_uuid", user.id)
          .eq("wallet_type", walletType)

        if (updateError) throw updateError
      } else {
        // Insert new row
        const { error: insertError } = await supabase.from("user_shares").insert({
          user_uuid: user.id,
          wallet_type: walletType,
          shares: newBalance,
          source: "wallet_update",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (insertError) throw insertError
      }

      // Refresh balances silently after update
      await refreshBalances(true)
    } catch (err: any) {
      console.error(`Error updating ${walletType}:`, err)
      setError(err.message)
      throw err
    }
  }

  // Update buy wallet
  const updateBuyWallet = async (amount: number, operation: "add" | "subtract") => {
    await updateWalletBalance("buy_wallet", amount, operation)
  }

  // Update hold wallet (pre or post)
  const updateHoldWallet = async (amount: number, operation: "add" | "subtract", walletType: "pre" | "post") => {
    const dbWalletType: ValidWalletType = walletType === "pre" ? "hold_wallet_pre_hold" : "hold_wallet_post_hold"
    await updateWalletBalance(dbWalletType, amount, operation)
  }

  // Update cashout wallet
  const updateCashoutWallet = async (amount: number, operation: "add" | "subtract") => {
    await updateWalletBalance("cashout_wallet", amount, operation)
  }

  // Convenience methods
  const topUpBuyWallet = async (amount: number) => {
    await updateBuyWallet(amount, "add")
  }

  const transferToHold = async (amount: number, fromType: "pre" | "post", toType: "pre" | "post") => {
    if (!user) return

    try {
      // Subtract from source wallet
      await updateHoldWallet(amount, "subtract", fromType)
      // Add to destination wallet
      await updateHoldWallet(amount, "add", toType)
    } catch (err: any) {
      console.error("Error transferring between hold wallets:", err)
      setError(err.message)
    }
  }

  const transferToCashout = async (amount: number) => {
    await updateCashoutWallet(amount, "add")
  }

  // Calculate total account value
  const getTotalAccountValue = () => {
    const sharePrice = 108.2 // Will be dynamic
    const totalShares = walletState.holdWalletPreHold + walletState.holdWalletPostHold
    const totalNAD = walletState.buyWalletBalance + walletState.cashoutWalletBalance
    return totalShares * sharePrice + totalNAD
  }

  // Context value
  const value = {
    ...walletState,
    updateBuyWallet,
    updateHoldWallet,
    updateCashoutWallet,
    topUpBuyWallet,
    transferToHold,
    transferToCashout,
    getTotalAccountValue,
    getCurrentSharePrice,
    refreshBalances,
    refreshWalletBalances,
    loading, // Only true on initial load
    error,
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

// Custom hook to use the wallet context
export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}

// Export safe formatting functions for use in components
export { formatCurrency, formatShares, safeNumber }
