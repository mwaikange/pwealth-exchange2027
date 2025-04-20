"use client"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { useVesting } from "@/contexts/vesting-context"
import { useTransactions } from "@/contexts/transaction-context"
import { TransactionTable } from "@/components/transaction-table"

export function DashboardContent() {
  const { vestingSchedules, getSchedulesByLevel } = useVesting()
  const { transactions, getRecentTransactions } = useTransactions()
  const recentTransactions = getRecentTransactions(3) // Reduced to 3 to fit on one page

  // Calculate total OUT-Transfers
  const totalOutTransfers = transactions
    .filter((tx) => tx.type === "OUT-TRANSFER")
    .reduce((sum, tx) => sum + tx.amountUsd, 0)

  // Calculate total OUT-Transfer tokens
  const totalOutTransferTokens = transactions
    .filter((tx) => tx.type === "OUT-TRANSFER")
    .reduce((sum, tx) => sum + tx.amount, 0)

  // Calculate total Referral Claims
  const totalReferralClaims = transactions
    .filter((tx) => tx.type === "REFERRAL CLAIM")
    .reduce((sum, tx) => sum + tx.amount, 0)

  // Calculate Active Vesting Expected Yield
  const activeVestingYield = (() => {
    // Calculate expected yield from active and unclaimed vesting schedules
    const yield1 = getSchedulesByLevel(1).filter((s) => s.invested && !s.claimed).length * 10 // Level 1 yields 10 tokens
    const yield2 = getSchedulesByLevel(2).filter((s) => s.invested && !s.claimed).length * 20 // Level 2 yields 20 tokens
    const yield3 = getSchedulesByLevel(3).filter((s) => s.invested && !s.claimed).length * 40 // Level 3 yields 40 tokens
    return yield1 + yield2 + yield3
  })()

  // Get most active schedule for each level
  const getMostActiveSchedule = (level: number) => {
    const levelSchedules = getSchedulesByLevel(level)
    // Filter for active schedules (invested but not claimed)
    const activeSchedules = levelSchedules.filter((s) => s.invested && !s.claimed)
    if (activeSchedules.length === 0) {
      return null // No active schedules
    }
    // Sort by progress (highest first)
    return activeSchedules.sort((a, b) => b.progress - a.progress)[0]
  }

  const level1Schedule = getMostActiveSchedule(1)
  const level2Schedule = getMostActiveSchedule(2)
  const level3Schedule = getMostActiveSchedule(3)

  return (
    <div className="h-full bg-[#1c1e26] overflow-hidden">
      {/* Page Title */}
      <div className="px-6 pt-4 pb-2">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
      </div>

      {/* Stats Grid - Reduced padding and margins */}
      <div className="px-6 grid grid-cols-5 gap-3">
        {/* Total OUT-Transfers to date */}
        <div className="bg-green-600 rounded-lg h-20 p-2 flex flex-col justify-center relative overflow-hidden">
          <div className="text-[10px] text-green-200">Total OUT-Transfers to date</div>
          <div className="text-2xl font-bold">{totalOutTransfers || 0}</div>
          <div className="text-[10px]">USD</div>
          <div className="absolute bottom-0 left-0 right-0 h-6 opacity-30">
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
          <div className="text-2xl font-bold">{totalOutTransferTokens || 0}</div>
          <div className="text-[10px]">tokens</div>
          <div className="absolute bottom-0 left-0 right-0 h-6 opacity-30">
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
          <div className="text-2xl font-bold">{totalReferralClaims || 0}</div>
          <div className="text-[10px]">tokens</div>
          <div className="absolute bottom-0 left-0 right-0 h-6 opacity-30">
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
          <div className="text-2xl font-bold">{activeVestingYield}</div>
          <div className="text-[10px]">tokens</div>
          <div className="absolute bottom-0 left-0 right-0 h-6 opacity-30">
            <svg viewBox="0 0 100 20" className="w-full h-full">
              <path
                fill="none"
                stroke="white"
                strokeWidth="1"
                d="M0,10 Q10,5 20,15 T40,5 T60,15 T80,5 T100,10"
                className="animate-pulse"
              />
            </svg>
          </div>
        </div>

        {/* Current Rate - Reduced font size */}
        <div className="bg-gray-700 rounded-lg h-20 p-2 flex flex-col justify-center relative overflow-hidden">
          <div className="text-[10px] text-gray-300">Current Rate</div>
          <div className="text-xl font-bold">1 PWT</div>
          <div className="text-[10px]">=</div>
          <div className="text-lg font-bold">10 USD</div>
          <div className="text-[8px] text-gray-400">PWT Cashout & Invest Wallets</div>
        </div>
      </div>

      {/* Top 3 Active vesting Schedules per Level - Reduced padding */}
      <div className="px-6 mt-3">
        <div className="bg-[#2a2d3a] rounded-lg overflow-hidden">
          <div className="flex justify-between items-center px-4 py-1">
            <h3 className="text-sm font-medium">Top 3 Active vesting Schedules per Level</h3>
            <Link href="/dashboard/vesting">
              <ChevronRight className="h-4 w-4 text-gray-400 hover:text-white cursor-pointer" />
            </Link>
          </div>

          <div className="p-2 space-y-2">
            {/* Level 1 */}
            <div className="flex items-center">
              <div className="w-16 text-xs">Level 1</div>
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs mr-2">
                {level1Schedule ? "2" : "-"}
              </div>
              <div className="flex-1 bg-gray-700 h-2 rounded-full overflow-hidden">
                {level1Schedule && (
                  <div className="h-full bg-green-500" style={{ width: `${level1Schedule.progress}%` }}></div>
                )}
              </div>
              <div className="w-12 text-right text-xs">{level1Schedule ? `${level1Schedule.progress}%` : "0%"}</div>
            </div>

            {/* Level 2 */}
            <div className="flex items-center">
              <div className="w-16 text-xs">Level 2</div>
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs mr-2">
                {level2Schedule ? "4" : "-"}
              </div>
              <div className="flex-1 bg-gray-700 h-2 rounded-full overflow-hidden">
                {level2Schedule && (
                  <div className="h-full bg-green-500" style={{ width: `${level2Schedule.progress}%` }}></div>
                )}
              </div>
              <div className="w-12 text-right text-xs">{level2Schedule ? `${level2Schedule.progress}%` : "0%"}</div>
            </div>

            {/* Level 3 */}
            <div className="flex items-center">
              <div className="w-16 text-xs">Level 3</div>
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs mr-2">
                {level3Schedule ? "8" : "-"}
              </div>
              <div className="flex-1 bg-gray-700 h-2 rounded-full overflow-hidden">
                {level3Schedule && (
                  <div className="h-full bg-green-500" style={{ width: `${level3Schedule.progress}%` }}></div>
                )}
              </div>
              <div className="w-12 text-right text-xs">{level3Schedule ? `${level3Schedule.progress}%` : "0%"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions - Reduced padding and number of transactions */}
      <div className="px-6 mt-3">
        <div className="bg-[#2a2d3a] rounded-lg overflow-hidden">
          <div className="flex justify-between items-center px-4 py-1">
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
