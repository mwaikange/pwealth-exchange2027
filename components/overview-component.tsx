"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ChevronRight } from "lucide-react"

// Metric Cards Mock Data
const metricCards = [
  { title: "Total Cashouts to Date", value: "N$ 4,250", color: "green" },
  { title: "Total Shares Matched", value: "1,847", color: "blue" },
  { title: "Referral Bonus", value: "23", color: "yellow" },
  { title: "Total Unvested Shares", value: "1,125", color: "purple" },
  { title: "Share Price", value: "N$100 per share", color: "gray" },
]

// Most Active Vesting Slots
const vestingSlots = [
  { slot: "Slot #3", percent: 95, shares: "45 shares", letter: "A" },
  { slot: "Slot #7", percent: 87, shares: "120 shares", letter: "B" },
  { slot: "Slot #12", percent: 78, shares: "280 shares", letter: "C" },
]

// Recent Transactions
const recentTransactions = [
  {
    description: "CASHOUT - Mobile Money",
    account: "Cashout Wallet",
    date: "2025-06-19",
    reference: "CMM-001",
    shares: "10 Shares",
    nad: "N$1,000",
  },
  {
    description: "SHARES MATCHED - Buy Order",
    account: "Buy Wallet",
    date: "2025-06-19",
    reference: "BUY-002",
    shares: "5 Shares",
    nad: "N$500",
  },
  {
    description: "CLAIM - Vesting Slot",
    account: "Hold Wallet",
    date: "2025-06-18",
    reference: "VST-003",
    shares: "3 Shares",
    nad: "N$300",
  },
]

const getCardColorClasses = (color: string) => {
  switch (color) {
    case "green":
      return "bg-green-600 text-white"
    case "blue":
      return "bg-blue-600 text-white"
    case "yellow":
      return "bg-yellow-500 text-black"
    case "purple":
      return "bg-purple-600 text-white"
    case "gray":
      return "bg-gray-600 text-white"
    default:
      return "bg-gray-600 text-white"
  }
}

const getProgressColor = (index: number) => {
  const colors = ["bg-green-500", "bg-blue-500", "bg-pink-500"]
  return colors[index] || "bg-gray-500"
}

const getSlotLetter = (index: number) => {
  const letters = ["A", "B", "C"]
  return letters[index] || "X"
}

export function OverviewComponent() {
  return (
    <div className="p-6 space-y-6 bg-[#1a1d29] text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {metricCards.map((card, index) => (
          <Card key={index} className={`${getCardColorClasses(card.color)} border-none`}>
            <CardContent className="p-4">
              <div className="text-xs font-medium mb-1 opacity-90">{card.title}</div>
              <div className="text-2xl font-bold">{card.value}</div>
              {card.color === "green" && <div className="text-xs opacity-75 mt-1">NAD</div>}
              {card.color === "blue" && <div className="text-xs opacity-75 mt-1">shares</div>}
              {card.color === "yellow" && <div className="text-xs opacity-75 mt-1">shares</div>}
              {card.color === "purple" && <div className="text-xs opacity-75 mt-1">shares</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Most Active Vesting Slots */}
      <div className="bg-[#2a2d3a] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Most Active Vesting Slots</h2>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>

        <div className="space-y-4">
          {vestingSlots.map((slot, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                  index === 0 ? "bg-green-500" : index === 1 ? "bg-blue-500" : "bg-pink-500"
                }`}
              >
                {getSlotLetter(index)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{slot.slot}</span>
                  <span className="text-sm font-bold">{slot.percent}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgressColor(index)}`}
                    style={{ width: `${slot.percent}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-[#2a2d3a] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 font-medium text-gray-300">Description</th>
                <th className="text-left py-2 font-medium text-gray-300">Account</th>
                <th className="text-left py-2 font-medium text-gray-300">Date</th>
                <th className="text-left py-2 font-medium text-gray-300">Reference</th>
                <th className="text-left py-2 font-medium text-gray-300">Amount (Shares)</th>
                <th className="text-left py-2 font-medium text-gray-300">Amount (NAD)</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((transaction, index) => (
                <tr key={index} className="border-b border-gray-800">
                  <td className="py-3 text-white">{transaction.description}</td>
                  <td className="py-3 text-gray-300">{transaction.account}</td>
                  <td className="py-3 text-gray-300">{transaction.date}</td>
                  <td className="py-3 text-gray-300">{transaction.reference}</td>
                  <td className="py-3 text-white">{transaction.shares}</td>
                  <td className="py-3 text-white">{transaction.nad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
