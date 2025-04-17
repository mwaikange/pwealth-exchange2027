"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

// Define transaction types
export type TransactionType =
  | "OUT-TRANSFER"
  | "OUT-AFT GIFT"
  | "IN-PWT RECEIPT"
  | "REFERRAL CLAIM"
  | "BUY-AFT RECEIPT"
  | "ACTIVATE FEE"
  | "IN-AFT GIFT"
  | "VESTING"
  | "CLAIM"

// Define wallet types
export type WalletType = "PWT Invest" | "PWT Cashout" | "AFT Wallet"

// Define transaction object structure
export interface Transaction {
  id: string
  type: TransactionType
  account: WalletType
  date: string
  amount: number
  amountUsd: number
  recipient?: string
  reference: string
  description?: string
}

// Define context type
type TransactionContextType = {
  transactions: Transaction[]
  addTransaction: (transaction: Omit<Transaction, "id" | "date" | "reference">) => void
  getRecentTransactions: (count: number) => Transaction[]
  getTransactionsByType: (type: TransactionType | "All" | "Earnings" | "Outflows") => Transaction[]
  getCashoutTransactions: () => Transaction[]
}

// Create context
const TransactionContext = createContext<TransactionContextType | undefined>(undefined)

// Generate a unique transaction ID
const generateTransactionId = () => {
  return `TRX-${Math.floor(Math.random() * 100000)}`
}

// Generate a formatted date string
const generateDateString = () => {
  const now = new Date()
  const day = now.getDate()
  const month = now.toLocaleString("default", { month: "short" })
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const ampm = hours >= 12 ? "pm" : "am"
  const formattedHours = hours % 12 || 12
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes

  return `${day} ${month}, ${formattedHours}:${formattedMinutes}${ampm}`
}

// Sample initial transactions
const initialTransactions: Transaction[] = [
  {
    id: "TRX-87686",
    type: "VESTING",
    account: "PWT Invest",
    date: "12 May, 5:40pm",
    amount: 80,
    amountUsd: 800,
    reference: "LEVEL 1C",
    description: "VESTING - LEVEL 1C",
  },
  {
    id: "TRX-87685",
    type: "VESTING",
    account: "PWT Invest",
    date: "12 May, 4:30pm",
    amount: 80,
    amountUsd: 800,
    reference: "LEVEL 1D",
    description: "VESTING - LEVEL 1D",
  },
  {
    id: "TRX-87684",
    type: "CLAIM",
    account: "PWT Cashout",
    date: "12 May, 3:20pm",
    amount: 10,
    amountUsd: 100,
    reference: "LEVEL 2B",
    description: "CLAIM - LEVEL 2B",
  },
  {
    id: "TRX-87683",
    type: "OUT-TRANSFER",
    account: "PWT Cashout",
    date: "12 May, 2:10pm",
    amount: 80,
    amountUsd: 800,
    recipient: "john@example.com",
    reference: "TRX-87683",
    description: "OUT-TRANSFER",
  },
  {
    id: "TRX-87682",
    type: "OUT-AFT GIFT",
    account: "AFT Wallet",
    date: "12 May, 1:00pm",
    amount: 80,
    amountUsd: 80,
    recipient: "sarah@example.com",
    reference: "TRX-87682",
    description: "OUT-AFT GIFT",
  },
  {
    id: "TRX-87681",
    type: "IN-PWT RECEIPT",
    account: "PWT Invest",
    date: "11 May, 11:50am",
    amount: 80,
    amountUsd: 800,
    reference: "TRX-87681",
    description: "IN-PWT RECEIPT",
  },
  {
    id: "TRX-87680",
    type: "REFERRAL CLAIM",
    account: "PWT Cashout",
    date: "11 May, 10:40am",
    amount: 80,
    amountUsd: 800,
    reference: "TRX-87680",
    description: "REFERRAL CLAIM",
  },
  {
    id: "TRX-87679",
    type: "BUY-AFT RECEIPT",
    account: "AFT Wallet",
    date: "11 May, 9:30am",
    amount: 80,
    amountUsd: 80,
    reference: "TRX-87679",
    description: "BUY-AFT RECEIPT",
  },
  {
    id: "TRX-87678",
    type: "ACTIVATE FEE",
    account: "AFT Wallet",
    date: "11 May, 8:20am",
    amount: 4,
    amountUsd: 4,
    reference: "LEVEL 2B",
    description: "ACTIVATE FEE -LEVEL 2B",
  },
  {
    id: "TRX-87677",
    type: "IN-AFT GIFT",
    account: "AFT Wallet",
    date: "11 May, 7:10am",
    amount: 8,
    amountUsd: 8,
    reference: "TRX-87677",
    description: "IN-AFT GIFT",
  },
]

// Provider component
export function TransactionProvider({ children }: { children: React.ReactNode }) {
  // State for transactions
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)

  // Load transactions from localStorage on initial render (if available)
  useEffect(() => {
    const savedTransactions = localStorage.getItem("transactions")
    if (savedTransactions) {
      try {
        setTransactions(JSON.parse(savedTransactions))
      } catch (error) {
        console.error("Failed to parse saved transactions:", error)
      }
    }
  }, [])

  // Save transactions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("transactions", JSON.stringify(transactions))
  }, [transactions])

  // Add a new transaction
  const addTransaction = (transaction: Omit<Transaction, "id" | "date" | "reference">) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: generateTransactionId(),
      date: generateDateString(),
      reference: `TRX-${Math.floor(Math.random() * 10000)}`,
    }

    setTransactions((prev) => [newTransaction, ...prev])
    return newTransaction
  }

  // Get recent transactions
  const getRecentTransactions = (count: number) => {
    return transactions.slice(0, count)
  }

  // Get transactions by type
  const getTransactionsByType = (type: TransactionType | "All" | "Earnings" | "Outflows") => {
    if (type === "All") {
      return transactions
    }

    if (type === "Earnings") {
      return transactions.filter((t) =>
        ["IN-PWT RECEIPT", "REFERRAL CLAIM", "BUY-AFT RECEIPT", "IN-AFT GIFT", "CLAIM"].includes(t.type),
      )
    }

    if (type === "Outflows") {
      return transactions.filter((t) => ["OUT-TRANSFER", "OUT-AFT GIFT", "ACTIVATE FEE", "VESTING"].includes(t.type))
    }

    return transactions.filter((t) => t.type === type)
  }

  // Get cashout transactions
  const getCashoutTransactions = () => {
    return transactions.filter((t) => ["OUT-TRANSFER", "OUT-AFT GIFT"].includes(t.type))
  }

  // Context value
  const value = {
    transactions,
    addTransaction,
    getRecentTransactions,
    getTransactionsByType,
    getCashoutTransactions,
  }

  return <TransactionContext.Provider value={value}>{children}</TransactionContext.Provider>
}

// Custom hook to use the transaction context
export function useTransactions() {
  const context = useContext(TransactionContext)
  if (context === undefined) {
    throw new Error("useTransactions must be used within a TransactionProvider")
  }
  return context
}
