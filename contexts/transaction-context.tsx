"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import { v4 as uuidv4 } from "uuid"

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
  | "AFT-TopUP" // Added new transaction type for AFT top-up

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
  sender?: string
}

// Define context type
type TransactionContextType = {
  transactions: Transaction[]
  addTransaction: (transaction: Omit<Transaction, "id" | "date" | "reference">) => Promise<Transaction>
  getRecentTransactions: (count: number) => Transaction[]
  getTransactionsByType: (type: TransactionType | "All" | "Earnings" | "Outflows") => Transaction[]
  getCashoutTransactions: () => Transaction[]
  refreshTransactions: () => Promise<void>
  loading: boolean
}

// Create context
const TransactionContext = createContext<TransactionContextType | undefined>(undefined)

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

// Provider component
export function TransactionProvider({ children }: { children: React.ReactNode }) {
  // State for transactions
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  // Function to fetch transactions
  const fetchTransactions = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Handle the case where the user has no transactions yet
      const query = supabase
        .from("transactions")
        .select("*")
        .eq("user_uuid", user.id)
        .order("created_at", { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error("Error fetching transactions:", error)
        // Set empty transactions array on error
        setTransactions([])
        return
      }

      if (data) {
        // Transform the data to match our Transaction interface
        const formattedTransactions: Transaction[] = data.map((tx) => ({
          id: tx.transaction_id,
          type: tx.transaction_type as TransactionType,
          account: tx.account_type as WalletType,
          date: new Date(tx.created_at).toLocaleString("en-US", {
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          }),
          amount: Number(tx.amount),
          amountUsd: Number(tx.amount_usd),
          recipient: tx.recipient_email,
          reference: tx.reference,
          description: tx.description,
          sender: tx.sender_email,
        }))

        setTransactions(formattedTransactions)
      } else {
        // Set empty array if no data
        setTransactions([])
      }
    } catch (error) {
      console.error("Error in fetchTransactions:", error)
      // Set empty transactions array on error
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  // Load transactions from Supabase on initial render
  useEffect(() => {
    fetchTransactions()
  }, [user])

  // Function to refresh transactions
  const refreshTransactions = async () => {
    await fetchTransactions()
  }

  // Add a new transaction
  const addTransaction = async (transaction: Omit<Transaction, "id" | "date" | "reference">) => {
    if (!user) throw new Error("User not authenticated")

    const transactionId = uuidv4()
    const reference = `TRX-${Math.floor(Math.random() * 10000)}`
    const dateString = generateDateString()

    // Create the new transaction object
    const newTransaction: Transaction = {
      ...transaction,
      id: transactionId,
      date: dateString,
      reference,
    }

    try {
      // Validate transaction type
      const validTypes: TransactionType[] = [
        "OUT-TRANSFER",
        "OUT-AFT GIFT",
        "IN-PWT RECEIPT",
        "REFERRAL CLAIM",
        "BUY-AFT RECEIPT",
        "ACTIVATE FEE",
        "IN-AFT GIFT",
        "VESTING",
        "CLAIM",
        "AFT-TopUP",
      ]

      if (!validTypes.includes(transaction.type)) {
        console.error("Invalid transaction type:", transaction.type)
        throw new Error(`Invalid transaction type: ${transaction.type}`)
      }

      // Insert into Supabase
      const { error } = await supabase.from("transactions").insert({
        transaction_id: transactionId,
        user_uuid: user.id,
        transaction_type: transaction.type,
        account_type: transaction.account,
        amount: transaction.amount,
        amount_usd: transaction.amountUsd,
        recipient_email: transaction.recipient,
        sender_email: transaction.sender,
        reference,
        description: transaction.description,
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error("Supabase error when adding transaction:", error)
        throw error
      }

      // Update local state
      setTransactions((prev) => [newTransaction, ...prev])
      console.log(`Transaction of type ${transaction.type} recorded successfully with ID: ${transactionId}`)

      return newTransaction
    } catch (error) {
      console.error("Error adding transaction:", error)
      throw error
    }
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
        ["IN-PWT RECEIPT", "REFERRAL CLAIM", "BUY-AFT RECEIPT", "IN-AFT GIFT", "CLAIM", "AFT-TopUP"].includes(t.type),
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
    refreshTransactions,
    loading,
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
