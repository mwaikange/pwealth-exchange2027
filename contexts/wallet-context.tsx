"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

// Define the shape of our wallet state (real data from Supabase)
type WalletState = {
  buyWalletBalance: number // NAD in buy_wallet
  holdWalletPreHold: number // Shares in hold_pre
  holdWalletPostHold: number // Shares in hold_post
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

  refreshBalances: () => Promise<void>
  loading: boolean
  error: string | null
}

// Create the context with default values
const WalletContext = createContext<WalletContextType | undefined>(undefined)

// Currency formatter for Namibian Dollars
const formatCurrency = (value: number) => `N$${value.toFixed(2)}`

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, session } = useAuth()

  // Fetch wallet balances from Supabase
  const refreshBalances = async () => {
    if (!user || !session) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch user wallet balances
      const { data: walletData, error: walletError } = await supabase
        .from("user_shares")
        .select("wallet_type, shares")
        .eq("user_uuid", user.id)

      if (walletError) {
        throw new Error(`Failed to fetch wallet data: ${walletError.message}`)
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
        switch (wallet.wallet_type) {
          case "buy_wallet":
            newState.buyWalletBalance = Number(wallet.shares) || 0
            break
          case "hold_pre":
            newState.holdWalletPreHold = Number(wallet.shares) || 0
            break
          case "hold_post":
            newState.holdWalletPostHold = Number(wallet.shares) || 0
            break
          case "cashout_wallet":
            newState.cashoutWalletBalance = Number(wallet.shares) || 0
            break
        }
      })

      // Also check for legacy activation fee balance if needed
      const { data: legacyData } = await supabase
        .from("user_wallets")
        .select("activation_fee_balance")
        .eq("user_uuid", user.id)
        .single()

      if (legacyData?.activation_fee_balance) {
        newState.aftBalance = Number(legacyData.activation_fee_balance) || 0
      }

      setWalletState(newState)
      console.log("Wallet balances refreshed:", newState)
    } catch (err: any) {
      console.error("Error fetching wallet balances:", err)
      setError(err.message || "Failed to load wallet data")
    } finally {
      setLoading(false)
    }
  }

  // Load balances when user changes
  useEffect(() => {
    refreshBalances()
  }, [user, session])

  // Get current share price from Supabase
  const getCurrentSharePrice = async (): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc("get_current_share_price")
      if (error) throw error
      return Number(data) || 108.2 // Fallback to current price
    } catch (err) {
      console.error("Error fetching share price:", err)
      return 108.2 // Fallback price
    }
  }

  // Update buy wallet
  const updateBuyWallet = async (amount: number, operation: "add" | "subtract") => {
    if (!user) return

    try {
      const newAmount = operation === "add" ? amount : -amount

      const { error } = await supabase.rpc("transfer_shares", {
        p_user_uuid: user.id,
        p_from_wallet: operation === "subtract" ? "buy_wallet" : "external",
        p_to_wallet: operation === "add" ? "buy_wallet" : "external",
        p_shares: Math.abs(amount),
        p_description: `Buy wallet ${operation}: ${formatCurrency(Math.abs(amount))}`,
      })

      if (error) throw error
      await refreshBalances()
    } catch (err: any) {
      console.error("Error updating buy wallet:", err)
      setError(err.message)
    }
  }

  // Update hold wallet (pre or post)
  const updateHoldWallet = async (amount: number, operation: "add" | "subtract", walletType: "pre" | "post") => {
    if (!user) return

    try {
      const walletName = walletType === "pre" ? "hold_pre" : "hold_post"
      const newAmount = operation === "add" ? amount : -amount

      const { error } = await supabase.rpc("transfer_shares", {
        p_user_uuid: user.id,
        p_from_wallet: operation === "subtract" ? walletName : "external",
        p_to_wallet: operation === "add" ? walletName : "external",
        p_shares: Math.abs(amount),
        p_description: `Hold ${walletType} ${operation}: ${Math.abs(amount)} shares`,
      })

      if (error) throw error
      await refreshBalances()
    } catch (err: any) {
      console.error("Error updating hold wallet:", err)
      setError(err.message)
    }
  }

  // Update cashout wallet
  const updateCashoutWallet = async (amount: number, operation: "add" | "subtract") => {
    if (!user) return

    try {
      const newAmount = operation === "add" ? amount : -amount

      const { error } = await supabase.rpc("transfer_shares", {
        p_user_uuid: user.id,
        p_from_wallet: operation === "subtract" ? "cashout_wallet" : "external",
        p_to_wallet: operation === "add" ? "cashout_wallet" : "external",
        p_shares: Math.abs(amount),
        p_description: `Cashout wallet ${operation}: ${formatCurrency(Math.abs(amount))}`,
      })

      if (error) throw error
      await refreshBalances()
    } catch (err: any) {
      console.error("Error updating cashout wallet:", err)
      setError(err.message)
    }
  }

  // Convenience methods
  const topUpBuyWallet = async (amount: number) => {
    await updateBuyWallet(amount, "add")
  }

  const transferToHold = async (amount: number, fromType: "pre" | "post", toType: "pre" | "post") => {
    if (!user) return

    try {
      const fromWallet = fromType === "pre" ? "hold_pre" : "hold_post"
      const toWallet = toType === "pre" ? "hold_pre" : "hold_post"

      const { error } = await supabase.rpc("transfer_shares", {
        p_user_uuid: user.id,
        p_from_wallet: fromWallet,
        p_to_wallet: toWallet,
        p_shares: amount,
        p_description: `Transfer: ${amount} shares from ${fromType} to ${toType}`,
      })

      if (error) throw error
      await refreshBalances()
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
    loading,
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

// Export currency formatter for use in components
export { formatCurrency }
