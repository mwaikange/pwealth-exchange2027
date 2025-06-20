"use client"

import type React from "react"
import { createContext, useState, useEffect, useContext, type ReactNode } from "react"
import { v4 as uuidv4 } from "uuid"

interface Transaction {
  id: string
  description: string
  amount: number
  date: Date
  type: "deposit" | "withdrawal"
  fromWallet?: string
  toWallet?: string
}

interface TransactionContextProps {
  transactions: Transaction[]
  addTransaction: (transaction: Omit<Transaction, "id" | "date">) => void
  deleteTransaction: (id: string) => void
  getTotalBalance: () => number
  getTotalDeposits: () => number
  getTotalWithdrawals: () => number
}

const TransactionContext = createContext<TransactionContextProps | undefined>(undefined)

interface TransactionProviderProps {
  children: ReactNode
}

const TransactionProvider: React.FC<TransactionProviderProps> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const storedTransactions = localStorage.getItem("transactions")
      return storedTransactions ? JSON.parse(storedTransactions) : []
    } catch (error) {
      console.error("Error parsing transactions from localStorage:", error)
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem("transactions", JSON.stringify(transactions))
  }, [transactions])

  const addTransaction = (transaction: Omit<Transaction, "id" | "date">) => {
    const newTransaction: Transaction = {
      id: uuidv4(),
      date: new Date(),
      ...transaction,
    }
    setTransactions([...transactions, newTransaction])
  }

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter((transaction) => transaction.id !== id))
  }

  const getTotalBalance = () => {
    return transactions.reduce((total, transaction) => {
      return transaction.type === "deposit" ? total + transaction.amount : total - transaction.amount
    }, 0)
  }

  const getTotalDeposits = () => {
    return transactions
      .filter((transaction) => transaction.type === "deposit")
      .reduce((total, transaction) => total + transaction.amount, 0)
  }

  const getTotalWithdrawals = () => {
    return transactions
      .filter((transaction) => transaction.type === "withdrawal")
      .reduce((total, transaction) => total + transaction.amount, 0)
  }

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        addTransaction,
        deleteTransaction,
        getTotalBalance,
        getTotalDeposits,
        getTotalWithdrawals,
      }}
    >
      {children}
    </TransactionContext.Provider>
  )
}

const useTransaction = () => {
  const context = useContext(TransactionContext)
  if (!context) {
    throw new Error("useTransaction must be used within a TransactionProvider")
  }
  return context
}

export { TransactionProvider, useTransaction }

// Example Usage (Can be placed in a separate component file)
const ExampleComponent = () => {
  const { transactions, addTransaction, deleteTransaction, getTotalBalance, getTotalDeposits, getTotalWithdrawals } =
    useTransaction()

  const handleAddTransaction = () => {
    addTransaction({
      description: "Shares Purchase",
      amount: 100,
      type: "withdrawal",
      fromWallet: "Hold Wallet (Pre-Hold)",
    })
  }

  const handleDeleteTransaction = (id: string) => {
    deleteTransaction(id)
  }

  return (
    <div>
      <h2>Transactions</h2>
      <ul>
        {transactions.map((transaction) => (
          <li key={transaction.id}>
            {transaction.description} - {transaction.amount} NAD - {transaction.type} -{" "}
            {transaction.fromWallet || transaction.toWallet}
            <button onClick={() => handleDeleteTransaction(transaction.id)}>Delete</button>
          </li>
        ))}
      </ul>
      <button onClick={handleAddTransaction}>Add Shares Purchase</button>
      <p>Total Balance: {getTotalBalance()} NAD</p>
      <p>Total Deposits: {getTotalDeposits()} NAD</p>
      <p>Total Withdrawals: {getTotalWithdrawals()} NAD</p>
    </div>
  )
}
