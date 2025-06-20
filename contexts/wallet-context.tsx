"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { formatNAD, calculateShareValue, formatShares } from "@/lib/price-calculations"
import { formatCurrency } from "@/lib/utils"

// Define the shape of our wallet state (share-based, NAD currency)
type WalletState = {
  buyWalletBalance: number // NAD balance for buying shares
  holdWalletBalance: number // Total shares in hold wallet
  cashoutWalletBalance: number // NAD balance ready for cashout
  // Pre/Post split for shares (not NAD)
  holdWalletPreHold: number // Shares available for vesting (was "Invest")
  holdWalletPostHold: number // Shares ready for exchange (after vesting)
}

// Define the context type with state and update functions
type WalletContextType = WalletState & {
  // Update functions
  updateBuyWallet: (amount: number, operation: "add" | "subtract") => Promise<void>
  updateHoldWallet: (shares: number, operation: "add" | "subtract") => Promise<void>
  updateCashoutWallet: (amount: number, operation: "add" | "subtract") => Promise<void>

  // Convenience methods for specific operations
  topUpBuyWallet: (amount: number) => Promise<void>
  transferToHold: (shares: number) => Promise<void>
  transferToCashout: (amount: number) => Promise<void>

  // Value calculations
  getTotalSharesValue: () => number
  getTotalAccountValue: () => number
  getSharePrice: () => number

  // Validation functions
  canCashout: (amount: number) => boolean
  getMinCashoutAmount: () => number
  getMinTradeAmount: () => number

  refreshBalances: () => Promise<void>
  loading: boolean
}

// Create the context with default values
const WalletContext = createContext<WalletContextType | undefined>(undefined)

// Static mock data for testing (converted from legacy tokens to shares)
const mockWalletData: WalletState = {
  buyWalletBalance: 1200.0, // NAD
  holdWalletBalance: 18.0, // Total shares (converted from 9 tokens * 2)
  cashoutWalletBalance: 0.0, // NAD
  holdWalletPreHold: 10.5, // Shares available for vesting (was "Invest")
  holdWalletPostHold: 7.5, // Shares ready for exchange (after vesting)
}

// Provider component
export function WalletProvider({ children }: { children: React.ReactNode }) {
  // State for wallet balances (using mock data with shares)
  const [walletState, setWalletState] = useState<WalletState>(mockWalletData)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  // Current share price (static for now)
  const getSharePrice = () => 100 // N$100 per share

  // Minimum amounts
  const getMinTradeAmount = () => 50 // N$50 minimum trade
  const getMinCashoutAmount = () => 100 // N$100 minimum cashout

  // Validation functions
  const canCashout = (amount: number) => {
    return amount >= getMinCashoutAmount() && amount <= walletState.cashoutWalletBalance
  }

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
      buyWalletBalance: Math.max(0, newBalance), // Prevent negative balance
    }))

    console.log(
      `Mock: ${operation} ${formatCurrency(amount)} to Buy Wallet. New balance: ${formatCurrency(newBalance)}`,
    )
  }

  const updateHoldWallet = async (shares: number, operation: "add" | "subtract") => {
    if (!user) return

    const newBalance =
      operation === "add" ? walletState.holdWalletBalance + shares : walletState.holdWalletBalance - shares

    // Calculate new pre/post split (60% pre-hold, 40% post-hold)
    const newPreHold = Math.max(0, newBalance * 0.6)
    const newPostHold = Math.max(0, newBalance * 0.4)

    setWalletState((prev) => ({
      ...prev,
      holdWalletBalance: Math.max(0, newBalance),
      holdWalletPreHold: newPreHold,
      holdWalletPostHold: newPostHold,
    }))

    console.log(`Mock: ${operation} ${shares} shares to Hold Wallet. New balance: ${newBalance} shares`)
  }

  const updateCashoutWallet = async (amount: number, operation: "add" | "subtract") => {
    if (!user) return

    const newBalance =
      operation === "add" ? walletState.cashoutWalletBalance + amount : walletState.cashoutWalletBalance - amount

    setWalletState((prev) => ({
      ...prev,
      cashoutWalletBalance: Math.max(0, newBalance),
    }))

    console.log(
      `Mock: ${operation} ${formatCurrency(amount)} to Cashout Wallet. New balance: ${formatCurrency(newBalance)}`,
    )
  }

  // Convenience methods for specific operations
  const topUpBuyWallet = async (amount: number) => {
    await updateBuyWallet(amount, "add")
  }

  const transferToHold = async (shares: number) => {
    await updateHoldWallet(shares, "add")
  }

  const transferToCashout = async (amount: number) => {
    await updateCashoutWallet(amount, "add")
  }

  // Value calculations
  const getTotalSharesValue = () => {
    const sharePrice = getSharePrice()
    return calculateShareValue(walletState.holdWalletBalance, sharePrice)
  }

  const getTotalAccountValue = () => {
    const sharesValue = getTotalSharesValue()
    return walletState.buyWalletBalance + sharesValue + walletState.cashoutWalletBalance
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
    getTotalSharesValue,
    getTotalAccountValue,
    getSharePrice,
    canCashout,
    getMinCashoutAmount,
    getMinTradeAmount,
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

// Export formatting functions for use in components
export { formatNAD, formatShares, calculateShareValue }

// ---------------------------------------------------------------------------
// TEMP compatibility export -- until all components import from @/lib/utils
export { formatCurrency } from "@/lib/utils"
