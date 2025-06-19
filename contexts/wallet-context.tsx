"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"
import { useAuth } from "@/contexts/auth-context"

// Define the shape of our NEW wallet state (frontend mapping)
type WalletState = {
  buyWalletBalance: number // Maps to activation_fee_balance
  holdWalletBalance: number // Maps to pwt_invest_balance (will split later)
  cashoutWalletBalance: number // Maps to pwt_cashout_balance
  // Temporary pre/post split for UI (50/50 for now)
  holdWalletPreHold: number // Calculated: holdWalletBalance * 0.5
  holdWalletPostHold: number // Calculated: holdWalletBalance * 0.5
}

// Define the context type with state and update functions
type WalletContextType = WalletState & {
  // Update functions (still using old backend fields for now)
  updateBuyWallet: (amount: number, operation: "add" | "subtract") => Promise<void>
  updateHoldWallet: (amount: number, operation: "add" | "subtract") => Promise<void>
  updateCashoutWallet: (amount: number, operation: "add" | "subtract") => Promise<void>

  // Convenience methods for specific operations
  topUpBuyWallet: (amount: number) => Promise<void>
  transferToHold: (amount: number) => Promise<void>
  transferToCashout: (amount: number) => Promise<void>

  // Calculated values
  getTotalAccountValue: () => number

  refreshBalances: () => Promise<void>
  loading: boolean
}

// Create the context with default values
const WalletContext = createContext<WalletContextType | undefined>(undefined)

// Static mock data for testing
const mockWalletData: WalletState = {
  buyWalletBalance: 1200.0,
  holdWalletBalance: 9.0, // Total hold wallet
  cashoutWalletBalance: 0.0,
  holdWalletPreHold: 5.25, // Available for vesting
  holdWalletPostHold: 3.75, // Ready for exchange
}

// Currency formatter for Namibian Dollars
const formatCurrency = (value: number) => `N$${value.toFixed(2)}`

// Provider component
export function WalletProvider({ children }: { children: React.ReactNode }) {
  // State for wallet balances (using mock data)
  const [walletState, setWalletState] = useState<WalletState>(mockWalletData)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  // Mock function to refresh balances (no actual backend call)
  const refreshBalances = async () => {
    setLoading(true)
    // Simulate loading delay
    await new Promise((resolve) => setTimeout(resolve, 500))
    console.log("Mock: Refreshed wallet balances")
    setLoading(false)
  }

  // Update functions (mock implementations)
  const updateBuyWallet = async (amount: number, operation: "add" | "subtract") => {
    if (!user) return

    const newBalance =
      operation === "add" ? walletState.buyWalletBalance + amount : walletState.buyWalletBalance - amount

    setWalletState((prev) => ({
      ...prev,
      buyWalletBalance: newBalance,
    }))

    console.log(`Mock: ${operation} ${amount} to Buy Wallet. New balance: ${newBalance}`)
  }

  const updateHoldWallet = async (amount: number, operation: "add" | "subtract") => {
    if (!user) return

    const newBalance =
      operation === "add" ? walletState.holdWalletBalance + amount : walletState.holdWalletBalance - amount

    // Calculate new pre/post split
    const newPreHold = newBalance * 0.6 // 60% pre-hold
    const newPostHold = newBalance * 0.4 // 40% post-hold

    setWalletState((prev) => ({
      ...prev,
      holdWalletBalance: newBalance,
      holdWalletPreHold: newPreHold,
      holdWalletPostHold: newPostHold,
    }))

    console.log(`Mock: ${operation} ${amount} to Hold Wallet. New balance: ${newBalance}`)
  }

  const updateCashoutWallet = async (amount: number, operation: "add" | "subtract") => {
    if (!user) return

    const newBalance =
      operation === "add" ? walletState.cashoutWalletBalance + amount : walletState.cashoutWalletBalance - amount

    setWalletState((prev) => ({
      ...prev,
      cashoutWalletBalance: newBalance,
    }))

    console.log(`Mock: ${operation} ${amount} to Cashout Wallet. New balance: ${newBalance}`)
  }

  // Convenience methods for specific operations
  const topUpBuyWallet = async (amount: number) => {
    await updateBuyWallet(amount, "add")
  }

  const transferToHold = async (amount: number) => {
    await updateHoldWallet(amount, "add")
  }

  const transferToCashout = async (amount: number) => {
    await updateCashoutWallet(amount, "add")
  }

  // Calculated values
  const getTotalAccountValue = () => {
    return walletState.buyWalletBalance + walletState.holdWalletBalance + walletState.cashoutWalletBalance
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
    refreshBalances,
    loading,
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
