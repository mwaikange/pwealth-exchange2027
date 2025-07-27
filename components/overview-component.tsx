"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronRight, ArrowUpRight, ArrowDownLeft, Coins, Loader2 } from "lucide-react"
import { useWallet } from "@/contexts/wallet-context"
import { useTransactions } from "@/contexts/transaction-context"
import { useVesting } from "@/contexts/vesting-context"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

interface MetricCard {
  title: string
  value: string
  color: string
  loading?: boolean
}

interface VestingSlot {
  slot: string
  percent: number
  shares: string
  letter: string
}

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
  const { user } = useAuth()
  const {
    buyWalletBalance,
    holdWalletPreHold,
    holdWalletPostHold,
    cashoutWalletBalance,
    loading: walletLoading,
  } = useWallet()
  const { transactions, loading: transactionsLoading } = useTransactions()
  const { getTotalVestingInProgress, loading: vestingLoading } = useVesting()

  const [metrics, setMetrics] = useState({
    totalCashouts: 0,
    totalSharesMatched: 0,
    referralBonus: 0,
    currentPrice: 108.2,
  })
  const [loading, setLoading] = useState(true)

  // Calculate real metrics from Supabase data
  useEffect(() => {
    const calculateMetrics = async () => {
      if (!user) return

      try {
        // Get total cashouts from transactions
        const cashoutTransactions = transactions.filter(
          (tx) => tx.transaction_type === "cashout_request" && tx.status === "completed",
        )
        const totalCashouts = cashoutTransactions.reduce((sum, tx) => sum + (tx.total_amount || 0), 0)

        // Get total shares matched from matched_orders
        const { data: matchedData } = await supabase
          .from("matched_orders")
          .select("shares_matched")
          .or(`buyer_uuid.eq.${user.id},seller_uuid.eq.${user.id}`)

        const totalSharesMatched = matchedData?.reduce((sum, match) => sum + Number(match.shares_matched), 0) || 0

        // Get referral bonuses from transactions
        const referralTransactions = transactions.filter(
          (tx) => tx.transaction_type === "referral_bonus" && tx.status === "completed",
        )
        const referralBonus = referralTransactions.reduce((sum, tx) => sum + (tx.shares || 0), 0)

        // Get current share price
        const { data: priceData } = await supabase.rpc("get_current_share_price")
        const currentPrice = Number(priceData) || 108.2

        setMetrics({
          totalCashouts,
          totalSharesMatched,
          referralBonus,
          currentPrice,
        })
      } catch (error) {
        console.error("Error calculating metrics:", error)
      } finally {
        setLoading(false)
      }
    }

    if (!transactionsLoading) {
      calculateMetrics()
    }
  }, [user, transactions, transactionsLoading])

  // Get most active vesting slots
  const getMostActiveVestingSlots = (): VestingSlot[] => {
    if (vestingLoading) return []

    // This would come from real vesting data
    // For now, we'll use the total vesting in progress
    const totalVesting = getTotalVestingInProgress()

    // Mock active slots based on real data
    return [
      { slot: "Retail Slot #1", percent: 85, shares: `${Math.floor(totalVesting * 0.4)} shares`, letter: "A" },
      { slot: "Small Biz Slot #2", percent: 72, shares: `${Math.floor(totalVesting * 0.35)} shares`, letter: "B" },
      { slot: "Corporate Slot #1", percent: 45, shares: `${Math.floor(totalVesting * 0.25)} shares`, letter: "C" },
    ].filter((slot) => Number.parseInt(slot.shares) > 0)
  }

  // Metric cards with real data
  const metricCards: MetricCard[] = [
    {
      title: "Total Cashouts to Date",
      value: `N$ ${metrics.totalCashouts.toFixed(2)}`,
      color: "green",
      loading: loading || transactionsLoading,
    },
    {
      title: "Total Shares Matched",
      value: metrics.totalSharesMatched.toString(),
      color: "blue",
      loading: loading,
    },
    {
      title: "Referral Bonus",
      value: metrics.referralBonus.toString(),
      color: "yellow",
      loading: loading || transactionsLoading,
    },
    {
      title: "Total Locked Shares",
      value: getTotalVestingInProgress().toString(),
      color: "purple",
      loading: vestingLoading,
    },
    {
      title: "Share Price",
      value: `N$${metrics.currentPrice.toFixed(2)}`,
      color: "gray",
      loading: loading,
    },
  ]

  const vestingSlots = getMostActiveVestingSlots()

  // Get recent transactions (real data)
  const recentTransactions = transactions.slice(0, 3).map((tx, index) => ({
    id: tx.id,
    description: tx.description || `${tx.transaction_type.toUpperCase()} Transaction`,
    account: tx.to_wallet || tx.from_wallet || "System",
    date: new Date(tx.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    reference: tx.reference_id || `REF-${tx.id.slice(0, 8)}`,
    amount: tx.shares?.toString() || "0",
    amountUsd: `N$${(tx.total_amount || 0).toFixed(0)}`,
    type: tx.transaction_type.toUpperCase(),
    isPositive: ["buy", "claim", "referral_bonus"].includes(tx.transaction_type.toLowerCase()),
  }))

  if (walletLoading || transactionsLoading || vestingLoading) {
    return (
      <div className="p-6 space-y-6 bg-[#1a1d29] text-white min-h-screen">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading your dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-[#1a1d29] text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {metricCards.map((card, index) => (
          <Card key={index} className={`${getCardColorClasses(card.color)} border-none`}>
            <CardContent className="p-4">
              <div className="text-xs font-medium mb-1 opacity-90">{card.title}</div>
              {card.loading ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <div className="text-lg">Loading...</div>
                </div>
              ) : (
                <div className="text-2xl font-bold">{card.value}</div>
              )}
              {card.color === "green" && <div className="text-xs opacity-75 mt-1">NAD</div>}
              {(card.color === "blue" || card.color === "yellow" || card.color === "purple") && (
                <div className="text-xs opacity-75 mt-1">shares</div>
              )}
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

        {vestingSlots.length > 0 ? (
          <div className="space-y-4">
            {vestingSlots.map((slot, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${getProgressColor(index)}`}
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
        ) : (
          <div className="text-center text-gray-400 py-8">
            <p>No active vesting slots</p>
            <p className="text-sm">Start vesting shares to see progress here</p>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-[#2a2d3a] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>

        {recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 bg-[#1c1e26]">
                  <th className="text-left py-2 px-4 text-[11px] font-medium text-gray-300">Description</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium text-gray-300">Account</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium text-gray-300">Date</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium text-gray-300">Reference</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium text-gray-300">Amount (Shares)</th>
                  <th className="text-left py-2 px-4 text-[11px] font-medium text-gray-300">Amount (NAD)</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-700">
                    <td className="py-[6px] px-4 text-[10px]">
                      <div className="flex items-center gap-2">
                        {transaction.type.includes("CASHOUT") && <ArrowDownLeft className="h-3 w-3 text-red-500" />}
                        {transaction.type.includes("BUY") && <ArrowUpRight className="h-3 w-3 text-green-500" />}
                        {transaction.type.includes("CLAIM") && <Coins className="h-3 w-3 text-blue-500" />}
                        <span className={transaction.isPositive ? "text-green-500" : "text-red-500"}>
                          {transaction.isPositive ? "+ " : "- "}
                        </span>
                        <span className="text-white">{transaction.description}</span>
                      </div>
                    </td>
                    <td className="py-[6px] px-4 text-[10px] text-gray-300">{transaction.account}</td>
                    <td className="py-[6px] px-4 text-[10px] text-gray-300">{transaction.date}</td>
                    <td className="py-[6px] px-4 text-[10px] text-gray-300">{transaction.reference}</td>
                    <td className="py-[6px] px-4 text-[10px] text-white">{transaction.amount} Shares</td>
                    <td className="py-[6px] px-4 text-[10px] text-white">{transaction.amountUsd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            <p>No recent transactions</p>
            <p className="text-sm">Your transaction history will appear here</p>
          </div>
        )}
      </div>
    </div>
  )
}
