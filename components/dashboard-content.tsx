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
      <div className="grid grid-cols-5 gap-4 mb-4">
        <div className="bg-green-600 p-4 rounded-lg">
          <div className="text-sm">Total OUT-Transfers to date</div>
          <div className="text-4xl font-bold">
            {useTransactions()
              .transactions.filter((tx) => tx.type === "OUT-TRANSFER")
              .reduce((sum, tx) => sum + tx.amountUsd, 0) || "300.00"}
          </div>
          <div className="text-sm">USD</div>
        </div>

        <div className="bg-blue-600 p-4 rounded-lg">
          <div className="text-sm">Total OUT-Transfer tokens</div>
          <div className="text-4xl font-bold">
            {useTransactions()
              .transactions.filter((tx) => tx.type === "OUT-TRANSFER")
              .reduce((sum, tx) => sum + tx.amount, 0) || "30"}
          </div>
          <div className="text-sm">tokens</div>
        </div>

        <div className="bg-yellow-500 p-4 rounded-lg">
          <div className="text-sm">Total Referral Claims sum</div>
          <div className="text-4xl font-bold">
            {useTransactions()
              .transactions.filter((tx) => tx.type === "REFERRAL CLAIM")
              .reduce((sum, tx) => sum + tx.amount, 0) || "6"}
          </div>
          <div className="text-sm">tokens</div>
        </div>

        <div className="bg-purple-600 p-4 rounded-lg">
          <div className="text-sm">Active Vesting Expected Yield</div>
          <div className="text-4xl font-bold">
            {useVesting()
              .vestingSchedules.filter((s) => s.invested && !s.claimed)
              .reduce((total, schedule) => {
                const levelYield = schedule.level === 1 ? 10 : schedule.level === 2 ? 20 : 40
                return total + levelYield
              }, 0) || "45"}
          </div>
          <div className="text-sm">tokens</div>
        </div>

        <div className="bg-gray-700 p-4 rounded-lg flex flex-col items-center justify-center">
          <div className="text-lg">Current Rate</div>
          <div className="text-2xl font-bold">1 PWT</div>
          <div className="text-lg">=</div>
          <div className="text-2xl font-bold">10 USD</div>
          <div className="text-[9px] text-center mt-1">PWT Cashout & Invest Wallets</div>
        </div>
      </div>

      {/* Vesting Schedules */}
      <div className="bg-[#2a2d3a] rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Top 3 Active vesting Schedules per Level</h2>
          <Link href="/dashboard/vesting" className="text-gray-400 hover:text-white">
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="space-y-4">
          {/* Level 1 */}
          <div className="flex items-center">
            <div className="mr-4 w-16">Level 1</div>
            <div className="w-8 h-8 rounded-full bg-gray-200 text-black flex items-center justify-center font-bold mr-4">
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
                      .sort((a, b) => b.progress - a.progress)[0]?.progress || 78
                  }%`,
                }}
              ></div>
            </div>
            <div className="ml-4 font-bold">
              {useVesting()
                .getSchedulesByLevel(1)
                .filter((s) => s.invested && !s.claimed)
                .sort((a, b) => b.progress - a.progress)[0]?.progress || 78}
              %
            </div>
          </div>

          {/* Level 2 */}
          <div className="flex items-center">
            <div className="mr-4 w-16">Level 2</div>
            <div className="w-8 h-8 rounded-full bg-gray-200 text-black flex items-center justify-center font-bold mr-4">
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
                      .sort((a, b) => b.progress - a.progress)[0]?.progress || 95
                  }%`,
                }}
              ></div>
            </div>
            <div className="ml-4 font-bold">
              {useVesting()
                .getSchedulesByLevel(2)
                .filter((s) => s.invested && !s.claimed)
                .sort((a, b) => b.progress - a.progress)[0]?.progress || 95}
              %
            </div>
          </div>

          {/* Level 3 */}
          <div className="flex items-center">
            <div className="mr-4 w-16">Level 3</div>
            <div className="w-8 h-8 rounded-full bg-gray-200 text-black flex items-center justify-center font-bold mr-4">
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
            <div className="ml-4 font-bold">
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
      <div className="bg-[#2a2d3a] rounded-lg p-4 flex-1">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Recent Transactions</h2>
          <Link href="/dashboard/transactions" className="text-gray-400 hover:text-white">
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>

        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-gray-700">
              <th className="py-2 px-4 font-medium">Description</th>
              <th className="py-2 px-4 font-medium">Account</th>
              <th className="py-2 px-4 font-medium">Date</th>
              <th className="py-2 px-4 font-medium">Amount (PWT)</th>
              <th className="py-2 px-4 font-medium">Amount (USD)</th>
            </tr>
          </thead>
          <tbody>
            {recentTransactions.length > 0
              ? recentTransactions.map((transaction, index) => (
                  <tr key={index} className="border-b border-gray-700">
                    <td className="py-2 px-4">
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
                    <td className="py-2 px-4">{transaction.account}</td>
                    <td className="py-2 px-4">{transaction.date}</td>
                    <td className="py-2 px-4">{transaction.amount} PWT</td>
                    <td className="py-2 px-4">{transaction.amountUsd} USD</td>
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
                    <td className="py-2 px-4">
                      <span className={item.type.includes("CLAIM") ? "text-green-400" : "text-red-400"}>
                        {item.type.includes("CLAIM") ? "+" : "-"}
                      </span>{" "}
                      {item.type}
                    </td>
                    <td className="py-2 px-4">{item.account}</td>
                    <td className="py-2 px-4">{item.date}</td>
                    <td className="py-2 px-4">{item.amount} PWT</td>
                    <td className="py-2 px-4">{item.amountUsd} USD</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
