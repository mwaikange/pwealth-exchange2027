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
  const [expectedVestingYield, setExpectedVestingYield] = useState(0)

  // Add this useEffect to calculate the sums for OUT-TRANSFER transactions
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

  // Calculate expected yield from active vesting schedules
  useEffect(() => {
    const expectedYield = calculateExpectedYield(vestingSchedules)
    setExpectedVestingYield(expectedYield)
  }, [vestingSchedules])

  // Placeholder value for referral claims
  const totalReferralClaims = 0

  // Get most active schedule for each level
  const level1Schedule = getMostActiveSchedule(vestingSchedules, 1)
  const level2Schedule = getMostActiveSchedule(vestingSchedules, 2)
  const level3Schedule = getMostActiveSchedule(vestingSchedules, 3)

  // Function to calculate expected yield from vesting schedules
  function calculateExpectedYield(schedules) {
    if (!schedules || schedules.length === 0) return 0

    let totalYield = 0

    schedules.forEach((schedule) => {
      if (schedule.invested && !schedule.claimed) {
        // Calculate potential reward based on level and progress
        let baseReward = 0

        if (schedule.progress >= 20) baseReward = 2
        if (schedule.progress >= 40) baseReward = 4
        if (schedule.progress >= 60) baseReward = 6
        if (schedule.progress >= 80) baseReward = 8
        if (schedule.progress >= 100) baseReward = 10

        // Multiply by level factor
        const levelMultiplier = schedule.level === 1 ? 1 : schedule.level === 2 ? 2 : 4
        const potentialReward = baseReward * levelMultiplier

        // Subtract any previous claims
        const previousClaim = calculateRewardForProgress(schedule.level, schedule.lastClaimPercentage)
        const netReward = potentialReward - previousClaim

        totalYield += netReward
      }
    })

    return totalYield
  }

  // Helper function to calculate reward for a given progress
  function calculateRewardForProgress(level, progress) {
    let baseReward = 0

    if (progress >= 20) baseReward = 2
    if (progress >= 40) baseReward = 4
    if (progress >= 60) baseReward = 6
    if (progress >= 80) baseReward = 8
    if (progress >= 100) baseReward = 10

    // Multiply by level factor
    const levelMultiplier = level === 1 ? 1 : level === 2 ? 2 : 4
    return baseReward * levelMultiplier
  }

  // Function to get the most active schedule for a level
  function getMostActiveSchedule(schedules, level) {
    if (!schedules || schedules.length === 0) return null

    // Filter schedules by level
    const levelSchedules = schedules.filter((s) => s.level === level)
    if (levelSchedules.length === 0) return null

    // Find the most active schedule (invested but not claimed, with highest progress)
    const activeSchedules = levelSchedules.filter((s) => s.invested && !s.claimed)
    if (activeSchedules.length === 0) return null

    // Sort by progress (descending) and return the first one
    return activeSchedules.sort((a, b) => b.progress - a.progress)[0]
  }

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
          <div className="text-3xl font-bold">{Math.floor(expectedVestingYield)}</div>
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
              <div
                className={`w-8 h-8 rounded-full ${
                  level1Schedule
                    ? level1Schedule.color === "green-500"
                      ? "bg-green-500"
                      : level1Schedule.color === "blue-500"
                        ? "bg-blue-500"
                        : level1Schedule.color === "pink-500"
                          ? "bg-pink-500"
                          : level1Schedule.color === "yellow-500"
                            ? "bg-yellow-500"
                            : level1Schedule.color === "red-500"
                              ? "bg-red-500"
                              : "bg-gray-700"
                    : "bg-gray-700"
                } flex items-center justify-center text-xs mr-2`}
              >
                {level1Schedule ? level1Schedule.position : "-"}
              </div>
              <div className="flex-1 bg-gray-700 h-2 rounded-full overflow-hidden">
                {level1Schedule && (
                  <div
                    className={
                      level1Schedule.color === "green-500"
                        ? "h-full bg-green-500"
                        : level1Schedule.color === "blue-500"
                          ? "h-full bg-blue-500"
                          : level1Schedule.color === "pink-500"
                            ? "h-full bg-pink-500"
                            : level1Schedule.color === "yellow-500"
                              ? "h-full bg-yellow-500"
                              : level1Schedule.color === "red-500"
                                ? "h-full bg-red-500"
                                : "h-full bg-gray-500"
                    }
                    style={{ width: `${level1Schedule.progress}%` }}
                  ></div>
                )}
              </div>
              <div className="w-12 text-right text-xs">{level1Schedule ? `${level1Schedule.progress}%` : "0%"}</div>
            </div>

            {/* Level 2 */}
            <div className="flex items-center">
              <div className="w-16 text-xs">Level 2</div>
              <div
                className={`w-8 h-8 rounded-full ${
                  level2Schedule
                    ? level2Schedule.color === "green-500"
                      ? "bg-green-500"
                      : level2Schedule.color === "blue-500"
                        ? "bg-blue-500"
                        : level2Schedule.color === "pink-500"
                          ? "bg-pink-500"
                          : level2Schedule.color === "yellow-500"
                            ? "bg-yellow-500"
                            : level2Schedule.color === "red-500"
                              ? "bg-red-500"
                              : "bg-gray-700"
                    : "bg-gray-700"
                } flex items-center justify-center text-xs mr-2`}
              >
                {level2Schedule ? level2Schedule.position : "-"}
              </div>
              <div className="flex-1 bg-gray-700 h-2 rounded-full overflow-hidden">
                {level2Schedule && (
                  <div
                    className={
                      level2Schedule.color === "green-500"
                        ? "h-full bg-green-500"
                        : level2Schedule.color === "blue-500"
                          ? "h-full bg-blue-500"
                          : level2Schedule.color === "pink-500"
                            ? "h-full bg-pink-500"
                            : level2Schedule.color === "yellow-500"
                              ? "h-full bg-yellow-500"
                              : level2Schedule.color === "red-500"
                                ? "h-full bg-red-500"
                                : "h-full bg-gray-500"
                    }
                    style={{ width: `${level2Schedule.progress}%` }}
                  ></div>
                )}
              </div>
              <div className="w-12 text-right text-xs">{level2Schedule ? `${level2Schedule.progress}%` : "0%"}</div>
            </div>

            {/* Level 3 */}
            <div className="flex items-center">
              <div className="w-16 text-xs">Level 3</div>
              <div
                className={`w-8 h-8 rounded-full ${
                  level3Schedule
                    ? level3Schedule.color === "green-500"
                      ? "bg-green-500"
                      : level3Schedule.color === "blue-500"
                        ? "bg-blue-500"
                        : level3Schedule.color === "pink-500"
                          ? "bg-pink-500"
                          : level3Schedule.color === "yellow-500"
                            ? "bg-yellow-500"
                            : level3Schedule.color === "red-500"
                              ? "bg-red-500"
                              : "bg-gray-700"
                    : "bg-gray-700"
                } flex items-center justify-center text-xs mr-2`}
              >
                {level3Schedule ? level3Schedule.position : "-"}
              </div>
              <div className="flex-1 bg-gray-700 h-2 rounded-full overflow-hidden">
                {level3Schedule && (
                  <div
                    className={
                      level3Schedule.color === "green-500"
                        ? "h-full bg-green-500"
                        : level3Schedule.color === "blue-500"
                          ? "h-full bg-blue-500"
                          : level3Schedule.color === "pink-500"
                            ? "h-full bg-pink-500"
                            : level3Schedule.color === "yellow-500"
                              ? "h-full bg-yellow-500"
                              : level3Schedule.color === "red-500"
                                ? "h-full bg-red-500"
                                : "h-full bg-gray-500"
                    }
                    style={{ width: `${level3Schedule.progress}%` }}
                  ></div>
                )}
              </div>
              <div className="w-12 text-right text-xs">{level3Schedule ? `${level3Schedule.progress}%` : "0%"}</div>
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
