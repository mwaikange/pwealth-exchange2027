"use client"

import { useState } from "react"
import { useTransactions } from "@/contexts/transaction-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, Download, Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"

export function TransactionHistory() {
  const { transactions, loading, error } = useTransactions()
  const [filter, setFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("date")

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "wallet" && ["wallet_topup", "cashout_request"].includes(tx.transaction_type)) ||
      (filter === "trading" && ["buy", "sell", "convert"].includes(tx.transaction_type)) ||
      (filter === "vesting" && ["vesting", "claim"].includes(tx.transaction_type)) ||
      (filter === "referral" && ["referral_bonus", "referral_claim"].includes(tx.transaction_type))

    const matchesSearch =
      searchTerm === "" ||
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.reference_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.transaction_type.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesFilter && matchesSearch
  })

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    if (sortBy === "amount") {
      return (b.total_amount || 0) - (a.total_amount || 0)
    }
    if (sortBy === "shares") {
      return (b.shares || 0) - (a.shares || 0)
    }
    return 0
  })

  const getTransactionTypeConfig = (type: string) => {
    const configs = {
      wallet_topup: {
        color: "bg-green-500/20 text-green-400 border-green-500/30",
        icon: "💰",
        category: "Wallet",
      },
      buy: {
        color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        icon: "🛒",
        category: "Trading",
      },
      sell: {
        color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
        icon: "📤",
        category: "Trading",
      },
      convert: {
        color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        icon: "🔄",
        category: "Trading",
      },
      vesting: {
        color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
        icon: "🔒",
        category: "Vesting",
      },
      claim: {
        color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        icon: "✅",
        category: "Vesting",
      },
      cashout_request: {
        color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        icon: "🏦",
        category: "Wallet",
      },
      referral_bonus: {
        color: "bg-pink-500/20 text-pink-400 border-pink-500/30",
        icon: "🎁",
        category: "Referral",
      },
      referral_claim: {
        color: "bg-pink-500/20 text-pink-400 border-pink-500/30",
        icon: "🏆",
        category: "Referral",
      },
    }

    return (
      configs[type as keyof typeof configs] || {
        color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
        icon: "📄",
        category: "Other",
      }
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: "bg-green-500/20 text-green-400 border-green-500/30",
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      started: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      expired: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
    }

    return statusConfig[status as keyof typeof statusConfig] || statusConfig.completed
  }

  const formatAmount = (amount?: number) => {
    return amount ? `${amount.toLocaleString()} NAD` : "-"
  }

  const formatShares = (shares?: number) => {
    return shares ? `${shares} PWT` : "-"
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <span className="ml-2 text-white">Loading transaction history...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-600 text-white p-4 rounded-lg">
          <h3 className="font-bold">Error Loading Transactions</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Transaction History</h1>
          <p className="text-gray-400">Track all your PeerWealth Token activities</p>
        </div>
        <Button className="bg-slate-600 hover:bg-slate-700">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-[#2a2d3a] border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#1c1e26] border-gray-600 text-white"
                />
              </div>
            </div>

            {/* Category Filter */}
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48 bg-[#1c1e26] border-gray-600 text-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="bg-[#1c1e26] border-gray-600">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="wallet">Wallet</SelectItem>
                <SelectItem value="trading">Trading</SelectItem>
                <SelectItem value="vesting">Vesting</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 bg-[#1c1e26] border-gray-600 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-[#1c1e26] border-gray-600">
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="shares">Shares</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#2a2d3a] border-gray-700">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {transactions.filter((tx) => tx.status === "completed").length}
              </div>
              <div className="text-sm text-gray-400">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#2a2d3a] border-gray-700">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {transactions.filter((tx) => tx.status === "pending").length}
              </div>
              <div className="text-sm text-gray-400">Pending</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#2a2d3a] border-gray-700">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {transactions.filter((tx) => tx.status === "started").length}
              </div>
              <div className="text-sm text-gray-400">In Progress</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#2a2d3a] border-gray-700">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{transactions.length}</div>
              <div className="text-sm text-gray-400">Total</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="bg-[#2a2d3a] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Transactions ({sortedTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedTransactions.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>No transactions found</p>
              <p className="text-sm">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Type</TableHead>
                    <TableHead className="text-gray-300">Description</TableHead>
                    <TableHead className="text-gray-300">Amount (NAD)</TableHead>
                    <TableHead className="text-gray-300">Shares (PWT)</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-300">Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTransactions.map((transaction) => {
                    const config = getTransactionTypeConfig(transaction.transaction_type)
                    return (
                      <TableRow key={transaction.id} className="border-gray-700 hover:bg-[#1c1e26]">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{config.icon}</span>
                            <Badge className={`${config.color} border`}>{config.category}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-white font-medium">{transaction.description}</TableCell>
                        <TableCell className="text-gray-300">{formatAmount(transaction.total_amount)}</TableCell>
                        <TableCell className="text-gray-300">{formatShares(transaction.shares)}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusBadge(transaction.status)} border capitalize`}>
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">{formatDate(transaction.created_at)}</TableCell>
                        <TableCell className="text-gray-400 font-mono text-sm">
                          {transaction.reference_id || `REF-${transaction.id.slice(0, 8)}`}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
