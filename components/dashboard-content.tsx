import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { useTransactions } from "@/contexts/transaction-context"
import { TransactionTable } from "@/components/transaction-table"
import { useVesting } from "@/contexts/vesting-context"

export function DashboardContent() {
  const { getRecentTransactions } = useTransactions()
  const recentTransactions = getRecentTransactions(4)

  return (
    <div className="p-3 h-full overflow-hidden bg-[#1c1e26]" style={{ marginTop: "-1%" }}>
      <h1 className="text-2xl font-bold mb-3" style={{ marginTop: "1%" }}>
        Dashboard Overview
      </h1>

      {/* Stats Grid */}
      <div
        className="grid grid-cols-5 gap-3 mb-4"
        style={{ transform: "scale(0.9)", transformOrigin: "top left", margin: "0 auto", width: "111.11%" }}
      >
        <div className="bg-green-600 rounded-lg" style={{ padding: "0.55rem" }}>
          <div className="text-xs">Total OUT-Transfers to date</div>
          <div className="text-3xl font-bold">
            {useTransactions()
              .transactions.filter((tx) => tx.type === "OUT-TRANSFER")
              .reduce((sum, tx) => sum + tx.amountUsd, 0)}
          </div>
          <div className="text-xs">USD</div>
        </div>

        <div className="bg-blue-600 rounded-lg" style={{ padding: "0.55rem" }}>
          <div className="text-xs">Total OUT-Transfer tokens</div>
          <div className="text-3xl font-bold">
            {useTransactions()
              .transactions.filter((tx) => tx.type === "OUT-TRANSFER")
              .reduce((sum, tx) => sum + tx.amount, 0)}
          </div>
          <div className="text-xs">tokens</div>
        </div>

        <div className="bg-yellow-600 rounded-lg" style={{ padding: "0.55rem" }}>
          <div className="text-xs">Total Referral Claims sum</div>
          <div className="text-3xl font-bold">
            {useTransactions()
              .transactions.filter((tx) => tx.type === "REFERRAL CLAIM")
              .reduce((sum, tx) => sum + tx.amount, 0)}
          </div>
          <div className="text-xs">tokens</div>
        </div>

        <div className="bg-purple-600 rounded-lg" style={{ padding: "0.55rem" }}>
          <div className="text-xs">Active Vesting Expected Yield</div>
          <div className="text-3xl font-bold">
            {useVesting()
              .vestingSchedules.filter((s) => s.invested && !s.claimed) // Only active schedules
              .reduce((total, schedule) => {
                // Calculate expected yield based on level
                const levelYield = schedule.level === 1 ? 10 : schedule.level === 2 ? 20 : 40
                return total + levelYield
              }, 0)}
          </div>
          <div className="text-xs">tokens</div>
        </div>

        <div
          className="bg-gray-600 rounded-lg flex flex-col items-center justify-center"
          style={{ padding: "0.55rem" }}
        >
          <div className="text-sm">Current Rate</div>
          <div className="text-xl font-bold">1 PWT</div>
          <div className="text-sm">=</div>
          <div className="text-xl font-bold">10 USD</div>
          <div className="text-[9px] text-center mt-1">PWT Cashout & Invest Wallets</div>
        </div>
      </div>

      {/* Vesting Schedules */}
      <div
        className="bg-[#2a2d3a] rounded-lg p-3 mb-4"
        style={{
          transform: "scale(0.9)",
          transformOrigin: "top left",
          margin: "5px auto 0",
          width: "111.11%",
        }}
      >
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-2xl font-bold">Top 3 Active vesting Schedules per Level</h2>
          <Link href="/dashboard/vesting" className="text-gray-400 hover:text-white">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-4">
          {/* Level 1 - Active schedule */}
          <div className="flex items-center">
            <div className="mr-3 w-12 text-sm">Level 1</div>
            <div className="w-8 h-8 rounded-full bg-gray-200 text-black flex items-center justify-center font-bold mr-3 text-sm">
              2
            </div>
            <div className="flex-1 bg-gray-700 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full"
                style={{
                  width: `${
                    useVesting()
                      .getSchedulesByLevel(1)
                      .filter((s) => s.invested && !s.claimed)
                      .sort((a, b) => b.progress - a.progress)[0]?.progress || 0
                  }%`,
                }}
              ></div>
            </div>
            <div className="ml-3 font-bold text-sm">
              {useVesting()
                .getSchedulesByLevel(1)
                .filter((s) => s.invested && !s.claimed)
                .sort((a, b) => b.progress - a.progress)[0]?.progress || 0}
              %
            </div>
          </div>

          {/* Level 2 - Active schedule */}
          <div className="flex items-center">
            <div className="mr-3 w-12 text-sm">Level 2</div>
            <div className="w-8 h-8 rounded-full bg-gray-200 text-black flex items-center justify-center font-bold mr-3 text-sm">
              4
            </div>
            <div className="flex-1 bg-gray-700 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full"
                style={{
                  width: `${
                    useVesting()
                      .getSchedulesByLevel(2)
                      .filter((s) => s.invested && !s.claimed)
                      .sort((a, b) => b.progress - a.progress)[0]?.progress || 0
                  }%`,
                }}
              ></div>
            </div>
            <div className="ml-3 font-bold text-sm">
              {useVesting()
                .getSchedulesByLevel(2)
                .filter((s) => s.invested && !s.claimed)
                .sort((a, b) => b.progress - a.progress)[0]?.progress || 0}
              %
            </div>
          </div>

          {/* Level 3 - Active schedule */}
          <div className="flex items-center">
            <div className="mr-3 w-12 text-sm">Level 3</div>
            <div className="w-8 h-8 rounded-full bg-gray-200 text-black flex items-center justify-center font-bold mr-3 text-sm">
              8
            </div>
            <div className="flex-1 bg-gray-700 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full"
                style={{
                  width: `${
                    useVesting()
                      .getSchedulesByLevel(3)
                      .filter((s) => s.invested && !s.claimed)
                      .sort((a, b) => b.progress - a.progress)[0]?.progress || 0
                  }%`,
                }}
              ></div>
            </div>
            <div className="ml-3 font-bold text-sm">
              {useVesting()
                .getSchedulesByLevel(3)
                .filter((s) => s.invested && !s.claimed)
                .sort((a, b) => b.progress - a.progress)[0]?.progress || 0}
              %
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div
        className="bg-[#2a2d3a] rounded-lg p-3"
        style={{
          transform: "scale(0.9)",
          transformOrigin: "top left",
          margin: "-2px auto 0",
          width: "111.11%",
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold">Recent Transactions</h2>
          <Link href="/dashboard/transactions" className="text-gray-400 hover:text-white">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <TransactionTable transactions={recentTransactions} showRecipient={false} showReference={false} />
      </div>
    </div>
  )
}
