"use client"

import type React from "react"

import { createContext, useContext } from "react"
import { mockTransactions, type Transaction } from "@/data/mock-transactions"

interface TransactionContextType {
  transactions: Transaction[]
  getTransactionsByType: (type?: string) => Transaction[]
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined)

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const getTransactionsByType = (type?: string) => {
    if (!type || type === "All") {
      return mockTransactions
    }

    // Filter by category instead of old earnings/outflows
    const categoryMap: Record<string, string[]> = {
      Earnings: ["REFERRAL_BONUS", "REFERRAL_CLAIM"],
      Outflows: ["CASHOUT_REQUESTED", "BUY_ORDER_PLACED", "SELL_ORDER_PLACED"],
    }

    const typesToShow = categoryMap[type] || []
    return mockTransactions.filter((tx) => typesToShow.includes(tx.type))
  }

  return (
    <TransactionContext.Provider
      value={{
        transactions: mockTransactions,
        getTransactionsByType,
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
export type TransactionType = "All" | "Earnings" | "Outflows"
