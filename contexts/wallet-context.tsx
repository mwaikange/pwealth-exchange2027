"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

// Define the shape of our wallet state
type WalletState = {
  pwtInvestBalance: number
  pwtCashoutBalance: number
  aftBalance: number
}

// Define the context type with state and update functions
type WalletContextType = WalletState & {
  updatePwtInvestBalance: (amount: number, operation: "add" | "subtract") => void
  updatePwtCashoutBalance: (amount: number, operation: "add" | "subtract") => void
  updateAftBalance: (amount: number, operation: "add" | "subtract") => void
  // Convenience methods for specific operations
  transferFromPwtCashout: (amount: number) => void
  transferFromAft: (amount: number) => void
  claimToPwtCashout: (amount: number) => void
  receivePwtInvest: (amount: number) => void
  receiveAft: (amount: number) => void
}

// Create the context with default values
const WalletContext = createContext<WalletContextType | undefined>(undefined)

// Initial wallet balances
const initialWalletState: WalletState = {
  pwtInvestBalance: 30,
  pwtCashoutBalance: 30,
  aftBalance: 30,
}

// Provider component
export function WalletProvider({ children }: { children: React.ReactNode }) {
  // State for wallet balances
  const [walletState, setWalletState] = useState<WalletState>(initialWalletState)

  // Load balances from localStorage on initial render (if available)
  useEffect(() => {
    const savedState = localStorage.getItem("walletState")
    if (savedState) {
      try {
        setWalletState(JSON.parse(savedState))
      } catch (error) {
        console.error("Failed to parse saved wallet state:", error)
      }
    }
  }, [])

  // Save balances to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("walletState", JSON.stringify(walletState))
  }, [walletState])

  // Update functions for each wallet
  const updatePwtInvestBalance = (amount: number, operation: "add" | "subtract") => {
    setWalletState((prev) => ({
      ...prev,
      pwtInvestBalance: operation === "add" ? prev.pwtInvestBalance + amount : prev.pwtInvestBalance - amount,
    }))
  }

  const updatePwtCashoutBalance = (amount: number, operation: "add" | "subtract") => {
    setWalletState((prev) => ({
      ...prev,
      pwtCashoutBalance: operation === "add" ? prev.pwtCashoutBalance + amount : prev.pwtCashoutBalance - amount,
    }))
  }

  const updateAftBalance = (amount: number, operation: "add" | "subtract") => {
    setWalletState((prev) => ({
      ...prev,
      aftBalance: operation === "add" ? prev.aftBalance + amount : prev.aftBalance - amount,
    }))
  }

  // Convenience methods for specific operations
  const transferFromPwtCashout = (amount: number) => {
    updatePwtCashoutBalance(amount, "subtract")
  }

  const transferFromAft = (amount: number) => {
    updateAftBalance(amount, "subtract")
  }

  const claimToPwtCashout = (amount: number) => {
    updatePwtCashoutBalance(amount, "add")
  }

  const receivePwtInvest = (amount: number) => {
    updatePwtInvestBalance(amount, "add")
  }

  const receiveAft = (amount: number) => {
    updateAftBalance(amount, "add")
  }

  // Context value
  const value = {
    ...walletState,
    updatePwtInvestBalance,
    updatePwtCashoutBalance,
    updateAftBalance,
    transferFromPwtCashout,
    transferFromAft,
    claimToPwtCashout,
    receivePwtInvest,
    receiveAft,
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
