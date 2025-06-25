"use client"

import { TransactionHistory } from "@/components/transaction-history"

export default function TransactionsPage() {
  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <TransactionHistory />
    </div>
  )
}
