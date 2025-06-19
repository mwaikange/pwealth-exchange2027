"use client"

import { useState } from "react"
import { mockTransactions, getTransactionTypeColor, getStatusColor, type Transaction } from "@/data/mock-transactions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface TransactionsHistoryProps {
  transactions?: Transaction[]
}

export function TransactionsHistory({ transactions = mockTransactions }: TransactionsHistoryProps) {
  const [filter, setFilter] = useState<"all" | "earnings" | "outflows">("all")

  const getFilteredTransactions = () => {
    if (filter === "all") return transactions

    if (filter === "earnings") {
      return transactions.filter(
        (tx) =>
          ["WALLET_TOPUP", "ORDER_MATCHED", "CLAIM", "REFERRAL_BONUS", "REFERRAL_CLAIM"].includes(tx.type) ||
          (tx.type === "ORDER_CANCELLED" && tx.to_wallet) ||
          (tx.type === "ORDER_EXPIRED" && tx.to_wallet),
      )
    }

    if (filter === "outflows") {
      return transactions.filter((tx) =>
        ["BUY_ORDER_PLACED", "SELL_ORDER_PLACED", "VESTING", "CASHOUT_REQUESTED"].includes(tx.type),
      )
    }

    return transactions
  }

  const getTransactionIcon = (type: string, status: string) => {
    if (status === "pending") return <Clock className="w-4 h-4" />
    if (status === "failed" || status === "cancelled") return <XCircle className="w-4 h-4" />
    if (status === "expired") return <AlertCircle className="w-4 h-4" />
    if (status === "completed") return <CheckCircle className="w-4 h-4" />

    // Default icons based on type
    if (["WALLET_TOPUP", "CLAIM", "REFERRAL_BONUS", "REFERRAL_CLAIM"].includes(type)) {
      return <ArrowDownLeft className="w-4 h-4 text-green-600" />
    }
    return <ArrowUpRight className="w-4 h-4 text-blue-600" />
  }

  const formatAmount = (amount?: number, shares?: number) => {
    const parts = []
    if (shares) parts.push(`${shares} PWT`)
    if (amount) parts.push(`${amount.toLocaleString()} NAD`)
    return parts.join(" • ") || "-"
  }

  const filteredTransactions = getFilteredTransactions()

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
        <p className="text-gray-400">Complete record of all your trading and wallet activities</p>
      </div>

      <Card className="bg-[#2a2d3a] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Transactions</CardTitle>

          {/* Filter Tabs */}
          <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-[#1c1e26]">
              <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-black">
                All ({transactions.length})
              </TabsTrigger>
              <TabsTrigger value="earnings" className="data-[state=active]:bg-white data-[state=active]:text-black">
                Earnings
              </TabsTrigger>
              <TabsTrigger value="outflows" className="data-[state=active]:bg-white data-[state=active]:text-black">
                Outflows
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Description</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Reference</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-700 hover:bg-[#1c1e26] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.type, transaction.status)}
                        <Badge className={`${getTransactionTypeColor(transaction.type)} text-xs font-medium`}>
                          {transaction.type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white">{transaction.description}</div>
                      {(transaction.from_wallet || transaction.to_wallet) && (
                        <div className="text-xs text-gray-400 mt-1">
                          {transaction.from_wallet && `From: ${transaction.from_wallet}`}
                          {transaction.from_wallet && transaction.to_wallet && " → "}
                          {transaction.to_wallet && `To: ${transaction.to_wallet}`}
                        </div>
                      )}
                      {transaction.price_per_share && (
                        <div className="text-xs text-gray-400 mt-1">Price: {transaction.price_per_share} NAD/share</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-white font-medium">
                      {formatAmount(transaction.amount, transaction.shares)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={`${getStatusColor(transaction.status)} text-xs font-medium capitalize`}>
                        {transaction.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-300 text-sm">
                      {new Date(transaction.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm font-mono">{transaction.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p>No transactions found for the selected filter.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#2a2d3a] border-gray-700">
          <CardContent className="p-4">
            <div className="text-sm text-gray-400">Total Transactions</div>
            <div className="text-2xl font-bold text-white">{transactions.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#2a2d3a] border-gray-700">
          <CardContent className="p-4">
            <div className="text-sm text-gray-400">Pending Orders</div>
            <div className="text-2xl font-bold text-yellow-400">
              {transactions.filter((t) => t.status === "pending").length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#2a2d3a] border-gray-700">
          <CardContent className="p-4">
            <div className="text-sm text-gray-400">Completed Today</div>
            <div className="text-2xl font-bold text-green-400">
              {
                transactions.filter(
                  (t) => t.status === "completed" && new Date(t.date).toDateString() === new Date().toDateString(),
                ).length
              }
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
