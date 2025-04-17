"use client"

import { useState } from "react"
import { useTransactions, type TransactionType } from "@/contexts/transaction-context"
import { TransactionTable } from "@/components/transaction-table"

export default function Transactions() {
  const [transactionType, setTransactionType] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"All" | "Earnings" | "Outflows">("All")
  const { getTransactionsByType } = useTransactions()

  // Get filtered transactions
  const filteredTransactions = getTransactionsByType(transactionType ? (transactionType as TransactionType) : activeTab)

  return (
    <div className="h-[calc(100vh-130px)] bg-[#1c1e26] overflow-hidden">
      {/* Page Title */}
      <div className="px-6 pt-4 pb-2">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-gray-400 text-sm">Overview of all transactions</p>
      </div>

      {/* Transactions Table */}
      <div className="px-6 mt-2">
        <div className="bg-[#2a2d3a] rounded-lg overflow-hidden">
          {/* Filter Section */}
          <div className="flex justify-between items-center py-3 px-4">
            {/* Transaction Type Dropdown */}
            <div className="relative">
              <select
                className="bg-[#1c1e26] text-white px-4 py-1.5 text-xs rounded-md border border-gray-700 appearance-none pr-8 cursor-pointer"
                onChange={(e) => setTransactionType(e.target.value)}
                value={transactionType}
              >
                <option value="">Filter by Transaction Type</option>
                <option value="VESTING">Vesting</option>
                <option value="CLAIM">Claim</option>
                <option value="OUT-TRANSFER">Out Transfer</option>
                <option value="OUT-AFT GIFT">Out AFT Gift</option>
                <option value="IN-PWT RECEIPT">In PWT Receipt</option>
                <option value="REFERRAL CLAIM">Referral Claim</option>
                <option value="BUY-AFT RECEIPT">Buy AFT Receipt</option>
                <option value="ACTIVATE FEE">Activate Fee</option>
                <option value="IN-AFT GIFT">In AFT Gift</option>
              </select>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M1 1L5 5L9 1"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="inline-flex rounded-md overflow-hidden">
              <button
                className={`px-6 py-1.5 text-xs font-medium ${activeTab === "All" ? "bg-white text-black" : "bg-[#1c1e26] text-white"}`}
                onClick={() => {
                  setActiveTab("All")
                  setTransactionType("")
                }}
              >
                All
              </button>
              <button
                className={`px-6 py-1.5 text-xs font-medium ${activeTab === "Earnings" ? "bg-white text-black" : "bg-[#1c1e26] text-white"}`}
                onClick={() => {
                  setActiveTab("Earnings")
                  setTransactionType("")
                }}
              >
                Earnings
              </button>
              <button
                className={`px-6 py-1.5 text-xs font-medium ${activeTab === "Outflows" ? "bg-white text-black" : "bg-[#1c1e26] text-white"}`}
                onClick={() => {
                  setActiveTab("Outflows")
                  setTransactionType("")
                }}
              >
                Outflows
              </button>
            </div>
          </div>

          {/* Table with fixed header and scrollable body */}
          <div className="relative">
            {/* Scrollable Body */}
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              <TransactionTable transactions={filteredTransactions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
