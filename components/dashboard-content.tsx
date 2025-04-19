import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { useTransactions } from "@/contexts/transaction-context"
import { useVesting } from "@/contexts/vesting-context"

export function DashboardContent() {
  const { getRecentTransactions } = useTransactions()
  const recentTransactions = getRecentTransactions(4)

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-4">Dashboard Overview</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-3 mb-3">
        <div className="bg-green-600 p-2.5 rounded-lg">
          <div className="text-xs">Total OUT-Transfers to date</div>
          <div className="text-2xl font-bold">
            {useTransactions()
              .transactions.filter((tx) => tx.type === "OUT-TRANSFER")
              .reduce((sum, tx) => sum + tx.amountUsd, 0) || "300.00"}
          </div>
          <div className="text-xs">USD</div>
        </div>

        <div className="bg-blue-600 p-2.5 rounded-lg">
          <div className="text-xs">Total OUT-Transfer tokens</div>
          <div className="text-2xl font-bold">
            {useTransactions()
              .transactions.filter((tx) => tx.type === "OUT-TRANSFER")
              .reduce((sum, tx) => sum + tx.amount, 0) || "30"}
          </div>
          <div className="text-xs">tokens</div>
        </div>

        <div className="bg-yellow-500 p-2.5 rounded-lg">
          <div className="text-xs">Total Referral Claims sum</div>
          <div className="text-2xl font-bold">
            {useTransactions()
              .transactions.filter((tx) => tx.type === "REFERRAL CLAIM")
              .reduce((sum, tx) => sum + tx.amount, 0) || "6"}
          </div>
          <div className="text-xs">tokens</div>
        </div>

        <div className="bg-purple-600 p-2.5 rounded-lg">
          <div className="text-xs">Active Vesting Expected Yield</div>
          <div className="text-2xl font-bold">
            {useVesting()
              .vestingSchedules.filter((s) => s.invested && !s.claimed)
              .reduce((total, schedule) => {
                const levelYield = schedule.level === 1 ? 10 : schedule.level === 2 ? 20 : 40
                return total + levelYield
              }, 0) || "45"}
          </div>
          <div className="text-xs">tokens</div>
        </div>

        <div className="bg-gray-700 p-2.5 rounded-lg flex flex-col items-center justify-center">
          <div className="text-sm">Current Rate</div>
          <div className="text-xl font-bold">1 PWT</div>
          <div className="text-sm">=</div>
          <div className="text-xl font-bold">10 USD</div>
          <div className="text-[8px] text-center mt-1">PWT Cashout & Invest Wallets</div>
        </div>
      </div>

      {/* Vesting Schedules */}
      <div className="bg-[#2a2d3a] rounded-lg p-3 mb-3">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-medium">Top 3 Active vesting Schedules per Level</h2>
          <Link href="/dashboard/vesting" className="text-gray-400 hover:text-white">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-3">
          {/* Level 1 */}
          <div className="flex items-center">
            <div className="mr-3 w-14 text-xs">Level 1</div>
            <div className="w-6 h-6 rounded-full bg-gray-200 text-black flex items-center justify-center font-bold mr-3 text-xs">
              2
            </div>
            <div className="flex-1 bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-green-500 h-2.5 rounded-full"
                style={{
                  width: `${
                    useVesting()
                      .getSchedulesByLevel(1)
                      .filter((s) => s.invested && !s.claimed)
                      .sort((a, b) => b.progress - a.progress)[0]?.progress || 78
                  }%`,
                }}
              ></div>
            </div>
            <div className="ml-3 font-bold text-xs">
              {useVesting()
                .getSchedulesByLevel(1)
                .filter((s) => s.invested && !s.claimed)
                .sort((a, b) => b.progress - a.progress)[0]?.progress || 78}
              %
            </div>
          </div>

          {/* Level 2 */}
          <div className="flex items-center">
            <div className="mr-3 w-14 text-xs">Level 2</div>
            <div className="w-6 h-6 rounded-full bg-gray-200 text-black flex items-center justify-center font-bold mr-3 text-xs">
              4
            </div>
            <div className="flex-1 bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-green-500 h-2.5 rounded-full"
                style={{
                  width: `${
                    useVesting()
                      .getSchedulesByLevel(2)
                      .filter((s) => s.invested && !s.claimed)
                      .sort((a, b) => b.progress - a.progress)[0]?.progress || 95
                  }%`,
                }}
              ></div>
            </div>
            <div className="ml-3 font-bold text-xs">
              {useVesting()
                .getSchedulesByLevel(2)
                .filter((s) => s.invested && !s.claimed)
                .sort((a, b) => b.progress - a.progress)[0]?.progress || 95}
              %
            </div>
          </div>

          {/* Level 3 */}
          <div className="flex items-center">
            <div className="mr-3 w-14 text-xs">Level 3</div>
            <div className="w-6 h-6 rounded-full bg-gray-200 text-black flex items-center justify-center font-bold mr-3 text-xs">
              8
            </div>
            <div className="flex-1 bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-green-500 h-2.5 rounded-full"
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
            <div className="ml-3 font-bold text-xs">
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
      <div className="bg-[#2a2d3a] rounded-lg p-3 flex-1">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-medium">Recent Transactions</h2>
          <Link href="/dashboard/transactions" className="text-gray-400 hover:text-white">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-gray-700">
              <th className="py-1.5 px-3 font-medium text-xs">Description</th>
              <th className="py-1.5 px-3 font-medium text-xs">Account</th>
              <th className="py-1.5 px-3 font-medium text-xs">Date</th>
              <th className="py-1.5 px-3 font-medium text-xs">Amount (PWT)</th>
              <th className="py-1.5 px-3 font-medium text-xs">Amount (USD)</th>
            </tr>
          </thead>
          <tbody>
            {recentTransactions.length > 0
              ? recentTransactions.map((transaction, index) => (
                  <tr key={index} className="border-b border-gray-700">
                    <td className="py-1.5 px-3 text-xs">
                      <span
                        className={
                          ["IN-PWT RECEIPT", "REFERRAL CLAIM", "BUY-AFT RECEIPT", "IN-AFT GIFT", "CLAIM"].includes(
                            transaction.type,
                          )
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {["IN-PWT RECEIPT", "REFERRAL CLAIM", "BUY-AFT RECEIPT", "IN-AFT GIFT", "CLAIM"].includes(
                          transaction.type,
                        )
                          ? "+"
                          : "-"}
                      </span>{" "}
                      {transaction.type}
                    </td>
                    <td className="py-1.5 px-3 text-xs">{transaction.account}</td>
                    <td className="py-1.5 px-3 text-xs">{transaction.date}</td>
                    <td className="py-1.5 px-3 text-xs">{transaction.amount} PWT</td>
                    <td className="py-1.5 px-3 text-xs">{transaction.amountUsd} USD</td>
                  </tr>
                ))
              : // Fallback data if no transactions
                [
                  {
                    type: "VESTING - LEVEL 1C",
                    account: "PWT Invest",
                    date: "12 May, 5:40pm",
                    amount: 80,
                    amountUsd: 800,
                  },
                  {
                    type: "VESTING - LEVEL 1D",
                    account: "PWT Invest",
                    date: "12 May, 4:30pm",
                    amount: 80,
                    amountUsd: 800,
                  },
                  {
                    type: "CLAIM - LEVEL 2B",
                    account: "PWT Cashout",
                    date: "12 May, 3:20pm",
                    amount: 10,
                    amountUsd: 100,
                  },
                ].map((item, index) => (
                  <tr key={index} className="border-b border-gray-700">
                    <td className="py-1.5 px-3 text-xs">
                      <span className={item.type.includes("CLAIM") ? "text-green-400" : "text-red-400"}>
                        {item.type.includes("CLAIM") ? "+" : "-"}
                      </span>{" "}
                      {item.type}
                    </td>
                    <td className="py-1.5 px-3 text-xs">{item.account}</td>
                    <td className="py-1.5 px-3 text-xs">{item.date}</td>
                    <td className="py-1.5 px-3 text-xs">{item.amount} PWT</td>
                    <td className="py-1.5 px-3 text-xs">{item.amountUsd} USD</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
