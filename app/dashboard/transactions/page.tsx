"use client"

import { useState, useMemo } from "react"
import { useTransactions } from "@/contexts/transaction-context"
import { TransactionTableSkeleton } from "@/components/skeletons/transaction-table-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download, RefreshCw } from "lucide-react"
import { format } from "date-fns"

export default function TransactionsPage() {
  const { transactions, loading, error, refreshTransactions } = useTransactions()

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [typeFilter, setTypeFilter] = useState("All Types")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  // Calculate transaction stats
  const stats = useMemo(() => {
    const completed = transactions.filter((tx) => tx.status === "completed").length
    const pending = transactions.filter((tx) => tx.status === "pending").length
    const inProgress = transactions.filter((tx) => tx.status === "in_progress").length
    const total = transactions.length

    return { completed, pending, inProgress, total }
  }, [transactions])

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search filter
      if (
        searchTerm &&
        !tx.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !tx.reference_id?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false
      }

      // Status filter
      if (statusFilter !== "All Statuses" && tx.status !== statusFilter.toLowerCase()) {
        return false
      }

      // Type filter
      if (typeFilter !== "All Types" && tx.transaction_type !== typeFilter.toLowerCase()) {
        return false
      }

      // Date filters
      if (fromDate && new Date(tx.created_at) < new Date(fromDate)) {
        return false
      }
      if (toDate && new Date(tx.created_at) > new Date(toDate)) {
        return false
      }

      return true
    })
  }, [transactions, searchTerm, statusFilter, typeFilter, fromDate, toDate])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Format shares
  const formatShares = (shares: number) => {
    return shares.toFixed(4)
  }

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-600 text-white">
            Completed
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-600 text-white">
            Pending
          </Badge>
        )
      case "in_progress":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-400">
            In Progress
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Get transaction type badge
  const getTypeBadge = (type: string) => {
    const typeColors: Record<string, string> = {
      vesting: "bg-purple-600",
      claim: "bg-green-600",
      buy: "bg-blue-600",
      sell: "bg-red-600",
      transfer: "bg-gray-600",
      referral_bonus: "bg-orange-600",
      cashout_request: "bg-yellow-600",
    }

    const bgColor = typeColors[type] || "bg-gray-600"

    return <Badge className={`${bgColor} text-white capitalize`}>{type.replace("_", " ")}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <TransactionTableSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <Card className="bg-red-900/20 border-red-700">
          <CardContent className="p-6">
            <div className="text-red-400 text-center">
              <h3 className="text-lg font-semibold mb-2">Error Loading Transactions</h3>
              <p>{error}</p>
              <Button onClick={refreshTransactions} className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Transaction History</h1>
            <p className="text-slate-400 mt-1">Track all your PeerWealth Token activities</p>
          </div>
          <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-4 mt-6">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-600 text-white placeholder-slate-400"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-slate-800 border-slate-600 text-white">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="All Statuses">All Categories</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px] bg-slate-800 border-slate-600 text-white">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="All Types">All Types</SelectItem>
              <SelectItem value="vesting">Vesting</SelectItem>
              <SelectItem value="claim">Claim</SelectItem>
              <SelectItem value="buy">Buy</SelectItem>
              <SelectItem value="sell">Sell</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
              <SelectItem value="referral_bonus">Referral</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Input
              type="date"
              placeholder="From date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-[140px] bg-slate-800 border-slate-600 text-white"
            />
            <Input
              type="date"
              placeholder="To date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-[140px] bg-slate-800 border-slate-600 text-white"
            />
          </div>

          <Button
            variant="outline"
            onClick={refreshTransactions}
            className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
              <div className="text-sm text-slate-400">Completed</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
              <div className="text-sm text-slate-400">Pending</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.inProgress}</div>
              <div className="text-sm text-slate-400">In Progress</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-300">{stats.total}</div>
              <div className="text-sm text-slate-400">Total</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white">Recent Transactions ({filteredTransactions.length})</CardTitle>
            <p className="text-slate-400 text-sm">Your latest PeerWealth Token activities</p>
          </CardHeader>
          <CardContent className="p-0">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-slate-400 text-lg mb-2">No transactions found</div>
                <p className="text-slate-500 text-sm">
                  {transactions.length === 0
                    ? "You haven't made any transactions yet."
                    : "Try adjusting your filters to see more results."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="text-left p-4 text-slate-300 font-medium">Date</th>
                      <th className="text-left p-4 text-slate-300 font-medium">Type</th>
                      <th className="text-left p-4 text-slate-300 font-medium">Reference</th>
                      <th className="text-right p-4 text-slate-300 font-medium">Shares</th>
                      <th className="text-right p-4 text-slate-300 font-medium">Price/Share</th>
                      <th className="text-right p-4 text-slate-300 font-medium">Total</th>
                      <th className="text-center p-4 text-slate-300 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction, index) => (
                      <tr
                        key={transaction.id}
                        className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${
                          index % 2 === 0 ? "bg-slate-800/20" : ""
                        }`}
                      >
                        <td className="p-4 text-slate-300">
                          {format(new Date(transaction.created_at), "MMM dd, yyyy")}
                          <div className="text-xs text-slate-500">
                            {format(new Date(transaction.created_at), "HH:mm:ss")}
                          </div>
                        </td>
                        <td className="p-4">{getTypeBadge(transaction.transaction_type)}</td>
                        <td className="p-4 text-slate-300 font-mono text-sm">{transaction.reference_id || "N/A"}</td>
                        <td className="p-4 text-right text-slate-300">
                          {transaction.shares ? formatShares(transaction.shares) : "-"}
                        </td>
                        <td className="p-4 text-right text-slate-300">
                          {transaction.price_per_share ? formatCurrency(transaction.price_per_share) : "-"}
                        </td>
                        <td className="p-4 text-right text-slate-300 font-medium">
                          {transaction.total_amount ? formatCurrency(transaction.total_amount) : "-"}
                        </td>
                        <td className="p-4 text-center">{getStatusBadge(transaction.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
