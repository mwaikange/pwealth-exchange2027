"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

// Define valid wallet types based on the constraint
type ValidWalletType = "buy_wallet" | "hold_pre" | "hold_post" | "cashout_wallet"

const VALID_WALLET_TYPES = new Set<ValidWalletType>(["buy_wallet", "hold_pre", "hold_post", "cashout_wallet"])

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

  // Helper function to update wallet balance directly
  const updateWalletBalance = async (walletType: ValidWalletType, amount: number, operation: "add" | "subtract") => {
    if (!user) return

    try {
      // Validate wallet type
      if (!VALID_WALLET_TYPES.has(walletType)) {
        throw new Error(`Invalid wallet type: ${walletType}`)
      }

      const changeAmount = operation === "add" ? amount : -amount

      // First, try to update existing row
      const { data: updateData, error: updateError } = await supabase
        .from("user_shares")
        .update({
          shares: supabase.raw(`shares + ${changeAmount}`),
          updated_at: new Date().toISOString(),
        })
        .eq("user_uuid", user.id)
        .eq("wallet_type", walletType)
        .select()

      // If no rows were updated, create a new row
      if (updateData && updateData.length === 0) {
        const { error: insertError } = await supabase.from("user_shares").insert({
          user_uuid: user.id,
          wallet_type: walletType,
          shares: Math.max(0, changeAmount), // Don't allow negative balances
          source: "wallet_update",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (insertError) throw insertError
      } else if (updateError) {
        throw updateError
      }

      await refreshBalances()
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
    const dbWalletType: ValidWalletType = walletType === "pre" ? "hold_pre" : "hold_post"
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
