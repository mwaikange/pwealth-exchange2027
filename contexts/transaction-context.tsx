"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

export interface Transaction {
  id: string
  user_uuid: string
  transaction_type: string
  shares?: number
  price_per_share?: number
  total_amount?: number
  from_wallet?: string
  to_wallet?: string
  status: string
  description: string
  reference_id?: string
  created_at: string
}

interface TransactionContextType {
  transactions: Transaction[]
  getTransactionsByType: (type?: string) => Transaction[]
  addTransaction: (transaction: Partial<Transaction>) => Promise<void>
  refreshTransactions: () => Promise<void>
  loading: boolean
  error: string | null
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined)

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, session } = useAuth()

  // Fetch transactions from Supabase
  const refreshTransactions = async () => {
    if (!user || !session) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("share_transactions")
        .select("*")
        .eq("user_uuid", user.id)
        .order("created_at", { ascending: false })
        .limit(50) // Get last 50 transactions

      if (fetchError) {
        throw new Error(`Failed to fetch transactions: ${fetchError.message}`)
      }

      setTransactions(data || [])
      console.log("Transactions refreshed:", data?.length || 0, "records")
    } catch (err: any) {
      console.error("Error fetching transactions:", err)
      setError(err.message || "Failed to load transactions")
    } finally {
      setLoading(false)
    }
  }

  // Load transactions when user changes
  useEffect(() => {
    refreshTransactions()
  }, [user, session])

  // Add new transaction
  const addTransaction = async (transaction: Partial<Transaction>) => {
    if (!user) return

    try {
      const newTransaction = {
        user_uuid: user.id,
        transaction_type: transaction.transaction_type || "transfer",
        shares: transaction.shares || 0,
        price_per_share: transaction.price_per_share || 0,
        total_amount: transaction.total_amount || 0,
        from_wallet: transaction.from_wallet,
        to_wallet: transaction.to_wallet,
        status: transaction.status || "completed",
        description: transaction.description || "Transaction",
        reference_id: transaction.reference_id || `TXN-${Date.now()}`,
      }

      const { error } = await supabase.from("share_transactions").insert([newTransaction])

      if (error) throw error

      // Refresh transactions to get the latest data
      await refreshTransactions()
    } catch (err: any) {
      console.error("Error adding transaction:", err)
      setError(err.message)
    }
  }

  // Filter transactions by type
  const getTransactionsByType = (type?: string) => {
    if (!type || type === "All") {
      return transactions
    }

    // Filter by category
    const categoryMap: Record<string, string[]> = {
      Earnings: ["referral_bonus", "claim", "vesting"],
      Outflows: ["cashout_request", "buy", "sell"],
      Trading: ["buy", "sell", "convert"],
      Vesting: ["vesting", "claim"],
    }

    const typesToShow = categoryMap[type] || [type.toLowerCase()]
    return transactions.filter((tx) => typesToShow.includes(tx.transaction_type.toLowerCase()))
  }

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        getTransactionsByType,
        addTransaction,
        refreshTransactions,
        loading,
        error,
      }}
    >
      {children}
    </TransactionContext.Provider>
  )
}

export function useTransactions() {
  const context = useContext(TransactionContext)
  if (context === undefined) {
    throw new Error("useTransactions must be used within a TransactionProvider")
  }
  return context
}

// Export types for backward compatibility
export type TransactionType = "All" | "Earnings" | "Outflows" | "Trading" | "Vesting"
