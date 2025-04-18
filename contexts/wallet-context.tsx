"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

// Define the shape of our wallet state
type WalletState = {
  pwtInvestBalance: number
  pwtCashoutBalance: number
  aftBalance: number
}

// Define the context type with state and update functions
type WalletContextType = WalletState & {
  updatePwtInvestBalance: (amount: number, operation: "add" | "subtract") => Promise<void>
  updatePwtCashoutBalance: (amount: number, operation: "add" | "subtract") => Promise<void>
  updateAftBalance: (amount: number, operation: "add" | "subtract") => Promise<void>
  // Convenience methods for specific operations
  transferFromPwtCashout: (amount: number) => Promise<void>
  transferFromAft: (amount: number) => Promise<void>
  claimToPwtCashout: (amount: number) => Promise<void>
  receivePwtInvest: (amount: number) => Promise<void>
  receiveAft: (amount: number) => Promise<void>
  loading: boolean
}

// Create the context with default values
const WalletContext = createContext<WalletContextType | undefined>(undefined)

// Initial wallet balances
const initialWalletState: WalletState = {
  pwtInvestBalance: 0,
  pwtCashoutBalance: 0,
  aftBalance: 0,
}

// Provider component
export function WalletProvider({ children }: { children: React.ReactNode }) {
  // State for wallet balances
  const [walletState, setWalletState] = useState<WalletState>(initialWalletState)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  // Load balances from Supabase on initial render
  useEffect(() => {
    async function fetchBalances() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        // Use .maybeSingle() instead of .single() to handle the case where no row exists
        const { data, error } = await supabase
          .from("balances")
          .select("pwt_invest_balance, pwt_cashout_balance, activation_fee_balance")
          .eq("user_uuid", user.id)
          .maybeSingle()

        if (error) {
          console.error("Error fetching balances:", error)
          return
        }

        if (data) {
          setWalletState({
            pwtInvestBalance: Number(data.pwt_invest_balance) || 0,
            pwtCashoutBalance: Number(data.pwt_cashout_balance) || 0,
            aftBalance: Number(data.activation_fee_balance) || 0,
          })
        } else {
          // If no data exists, initialize with zeros and create a record
          setWalletState({
            pwtInvestBalance: 0,
            pwtCashoutBalance: 0,
            aftBalance: 0,
          })

          // Create initial balance record if it doesn't exist
          try {
            await supabase.from("balances").insert({
              user_uuid: user.id,
              pwt_invest_balance: 0,
              pwt_cashout_balance: 0,
              activation_fee_balance: 0,
              display_id: user.id.substring(0, 8).toUpperCase(), // Generate a simple display ID
              updated_at: new Date().toISOString(),
            })
          } catch (insertError) {
            console.error("Error creating initial balance:", insertError)
          }
        }
      } catch (error) {
        console.error("Error in fetchBalances:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBalances()
  }, [user])

  // Update functions for each wallet
  const updatePwtInvestBalance = async (amount: number, operation: "add" | "subtract") => {
    if (!user) return

    const newBalance =
      operation === "add" ? walletState.pwtInvestBalance + amount : walletState.pwtInvestBalance - amount

    // Update local state first for immediate UI feedback
    setWalletState((prev) => ({
      ...prev,
      pwtInvestBalance: newBalance,
    }))

    // Then update in Supabase
    await supabase
      .from("balances")
      .update({
        pwt_invest_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("user_uuid", user.id)
  }

  const updatePwtCashoutBalance = async (amount: number, operation: "add" | "subtract") => {
    if (!user) return

    const newBalance =
      operation === "add" ? walletState.pwtCashoutBalance + amount : walletState.pwtCashoutBalance - amount

    // Update local state first
    setWalletState((prev) => ({
      ...prev,
      pwtCashoutBalance: newBalance,
    }))

    // Then update in Supabase
    await supabase
      .from("balances")
      .update({
        pwt_cashout_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("user_uuid", user.id)
  }

  const updateAftBalance = async (amount: number, operation: "add" | "subtract") => {
    if (!user) return

    const newBalance = operation === "add" ? walletState.aftBalance + amount : walletState.aftBalance - amount

    // Update local state first
    setWalletState((prev) => ({
      ...prev,
      aftBalance: newBalance,
    }))

    // Then update in Supabase
    await supabase
      .from("balances")
      .update({
        activation_fee_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("user_uuid", user.id)
  }

  // Convenience methods for specific operations
  const transferFromPwtCashout = async (amount: number) => {
    await updatePwtCashoutBalance(amount, "subtract")
  }

  const transferFromAft = async (amount: number) => {
    await updateAftBalance(amount, "subtract")
  }

  const claimToPwtCashout = async (amount: number) => {
    await updatePwtCashoutBalance(amount, "add")
  }

  const receivePwtInvest = async (amount: number) => {
    await updatePwtInvestBalance(amount, "add")
  }

  const receiveAft = async (amount: number) => {
    await updateAftBalance(amount, "add")
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
