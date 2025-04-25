"use client"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { useVesting } from "@/contexts/vesting-context"
import { useTransactions } from "@/contexts/transaction-context"
import { TransactionTable } from "@/components/transaction-table"
import { useState, useEffect } from "react"

export function DashboardContent() {
  const { vestingSchedules } = useVesting()
  const { transactions } = useTransactions()
  const { getRecentTransactions } = useTransactions()
  const recentTransactions = getRecentTransactions(3)

  // State for the stat cards
  const [totalOutTransfersUSD, setTotalOutTransfersUSD] = useState(0)
  const [totalOutTransfersTokens, setTotalOutTransfersTokens] = useState(0)

  // Add this useEffect to calculate the sums
  useEffect(() => {
    // Filter transactions to get only OUT-TRANSFER types
    const outTransfers = transactions.filter((tx) => tx.type === "OUT-TRANSFER")

    // Sum up the USD values
    const totalUSD = outTransfers.reduce((sum, tx) => sum + tx.amountUsd, 0)

    // Sum up the token amounts
    const totalTokens = outTransfers.reduce((sum, tx) => sum + tx.amount, 0)

    // Update the states
    setTotalOutTransfersUSD(totalUSD)
    setTotalOutTransfersTokens(totalTokens)
  }, [transactions])

  // Placeholder values for other stat cards
  const totalReferralClaims = 0
  const expectedVestingYield = 0

  // Placeholder for level schedules
  const level1Schedule = null
  const level2Schedule = null
  const level3Schedule = null

  return (
    <div className="h-full bg-[#1c1e26]">
      {/* Page Title */}
      <div className="px-6 pt-4 pb-2">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
      </div>

      {/* Stats Grid */}
      <div className="px-6 grid grid-cols-5 gap-3">
        {/* Total OUT-Transfers to date */}
        <div className="bg-green-600 rounded-lg h-20 p-2 flex flex-col justify-center relative overflow-hidden">
          <div className="text-[10px] text-green-200">Total OUT-Transfers to date</div>
          <div className="text-3xl font-bold">{Math.floor(totalOutTransfersUSD)}</div>
          <div className="text-[10px]">USD</div>
          <div className="absolute bottom-0 left-0 right-0 h-8 opacity-30">
            <svg viewBox="0 0 100 20" className="w-full h-full">
              <path
                fill="none"
                stroke="white"
                strokeWidth="1"
                d="M0,10 Q10,15 20,10 T40,10 T60,10 T80,10 T100,10"
                className="animate-pulse"
              />
            </svg>
          </div>
        </div>

        {/* Total OUT-Transfer tokens */}
        <div className="bg-blue-600 rounded-lg h-20 p-2 flex flex-col justify-center relative overflow-hidden">
          <div className="text-[10px] text-blue-200">Total OUT-Transfer tokens</div>
          <div className="text-3xl font-bold">{Math.floor(totalOutTransfersTokens)}</div>
          <div className="text-[10px]">tokens</div>
          <div className="absolute bottom-0 left-0 right-0 h-8 opacity-30">
            <svg viewBox="0 0 100 20" className="w-full h-full">
              <path
                fill="none"
                stroke="white"
                strokeWidth="1"
                d="M0,10 Q10,5 20,10 T40,15 T60,10 T80,5 T100,10"
                className="animate-pulse"
              />
            </svg>
          </div>
        </div>

        {/* Total Referral Claims sum */}
        <div className="bg-yellow-500 rounded-lg h-20 p-2 flex flex-col justify-center relative overflow-hidden">
          <div className="text-[10px] text-yellow-800">Total Referral Claims sum</div>
          <div className="text-3xl font-bold">0</div>
          <div className="text-[10px]">tokens</div>
          <div className="absolute bottom-0 left-0 right-0 h-8 opacity-30">
            <svg viewBox="0 0 100 20" className="w-full h-full">
              <path
                fill="none"
                stroke="white"
                strokeWidth="1"
                d="M0,10 Q10,15 20,5 T40,10 T60,15 T80,10 T100,5"
                className="animate-pulse"
              />
            </svg>
          </div>
        </div>

        {/* Active Vesting Expected Yield */}
        <div className="bg-purple-600 rounded-lg h-20 p-2 flex flex-col justify-center relative overflow-hidden">
          <div className="text-[10px] text-purple-200">Active Vesting Expected Yield</div>
          <div className="text-3xl font-bold">0</div>
          <div className="text-[10px]">tokens</div>
          <div className="absolute bottom-0 left-0 right-0 h-8 opacity-30">
            <svg viewBox="0 0 100 20" className="w-full h-full">
              <path fill="none" stroke="white" strokeWidth="1" d="M0,10 Q10,5 20,15 T40,5 T60,15 T80,5 T100,10" />
            </svg>
          </div>
        </div>

        {/* Exchange Rate */}
        <div className="bg-gray-700 rounded-lg h-20 p-2 flex flex-col justify-center relative overflow-hidden">
          <div className="text-[10px] text-gray-300">Exchange Rate</div>
          <div className="text-2xl font-bold">1 PWT = 10 USD</div>
          <div className="text-[8px] text-gray-400 mt-1">PWT Cashout & Invest Wallets</div>
        </div>
      </div>

      {/* Top 3 Active vesting Schedules per Level */}
      <div className="px-6 mt-4">
        <div className="bg-[#2a2d3a] rounded-lg overflow-hidden">
          <div className="flex justify-between items-center px-4 py-2">
            <h3 className="text-sm font-medium">Top 3 Active vesting Schedules per Level</h3>
            <Link href="/dashboard/vesting">
              <ChevronRight className="h-4 w-4 text-gray-400 hover:text-white cursor-pointer" />
            </Link>
          </div>

          <div className="p-3 space-y-3">
            {/* Level 1 */}
            <div className="flex items-center">
              <div className="w-16 text-xs">Level 1</div>
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs mr-2">-</div>
              <div className="flex-1 bg-gray-700 h-2 rounded-full overflow-hidden">{/* Progress bar removed */}</div>
              <div className="w-12 text-right text-xs">0%</div>
            </div>

            {/* Level 2 */}
            <div className="flex items-center">
              <div className="w-16 text-xs">Level 2</div>
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs mr-2">-</div>
              <div className="flex-1 bg-gray-700 h-2 rounded-full overflow-hidden">{/* Progress bar removed */}</div>
              <div className="w-12 text-right text-xs">0%</div>
            </div>

            {/* Level 3 */}
            <div className="flex items-center">
              <div className="w-16 text-xs">Level 3</div>
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs mr-2">-</div>
              <div className="flex-1 bg-gray-700 h-2 rounded-full overflow-hidden">{/* Progress bar removed */}</div>
              <div className="w-12 text-right text-xs">0%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="px-6 mt-4 pb-4">
        <div className="bg-[#2a2d3a] rounded-lg overflow-hidden">
          <div className="flex justify-between items-center px-4 py-2">
            <h3 className="text-sm font-medium">Recent Transactions</h3>
            <Link href="/dashboard/transactions">
              <ChevronRight className="h-4 w-4 text-gray-400 hover:text-white cursor-pointer" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <TransactionTable transactions={recentTransactions} showAccount={true} compact={true} />
          </div>
        </div>
      </div>
    </div>
  )
}
