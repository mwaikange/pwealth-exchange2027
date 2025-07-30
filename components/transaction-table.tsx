"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Search, Filter, Download, Calendar } from "lucide-react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import { TransactionTableSkeleton } from "@/components/skeletons/transaction-table-skeleton"

interface Transaction {
  id: string
  user_uuid: string
  transaction_type: string
  shares?: number
  total_amount: number
  from_wallet?: string
  to_wallet?: string
  status: string
  description: string
  created_at: string
  reference_id?: string
  buy_ref?: string
  sell_ref?: string
}

export function TransactionTable() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [dateRange, setDateRange] = useState("all")
  const itemsPerPage = 15

  useEffect(() => {
    if (user) {
      fetchTransactions()
    }
  }, [user])

  useEffect(() => {
    filterTransactions()
  }, [transactions, searchTerm, statusFilter, typeFilter, dateRange])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Fetching transaction history...")

      // Fetch from share_transactions and join with buy_orders and sell_orders for references
      const { data: shareTransactions, error: shareError } = await supabase
        .from("share_transactions")
        .select(`
          *,
          buy_orders!left(buy_ref),
          sell_orders!left(sell_ref)
        `)
        .eq("user_uuid", user?.id)
        .order("created_at", { ascending: false })
        .limit(200)

      if (shareError) {
        console.error("Error fetching share transactions:", shareError)
        throw new Error("Failed to fetch transactions: " + shareError.message)
      }

      // Format share transactions data with proper references
      const formattedTransactions = (shareTransactions || []).map((tx: any) => ({
        id: tx.id,
        user_uuid: tx.user_uuid,
        transaction_type: tx.transaction_type || "unknown",
        shares: Number(tx.shares) || 0,
        total_amount: Number(tx.total_amount) || 0,
        from_wallet: tx.from_wallet,
        to_wallet: tx.to_wallet,
        status: tx.status || "completed",
        description: tx.description || "No description",
        created_at: tx.created_at,
        reference_id: tx.reference_id,
        buy_ref: tx.buy_orders?.buy_ref,
        sell_ref: tx.sell_orders?.sell_ref,
      }))

      setTransactions(formattedTransactions)
      console.log("✅ Transactions loaded:", formattedTransactions.length)
    } catch (err: any) {
      console.error("❌ Error fetching transactions:", err)
      setError(err.message || "Failed to fetch transactions")
    } finally {
      setLoading(false)
    }
  }

  const filterTransactions = () => {
    let filtered = [...transactions]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (tx) =>
          tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.reference_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.buy_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.sell_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.transaction_type.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((tx) => tx.status.toLowerCase() === statusFilter.toLowerCase())
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((tx) => tx.transaction_type.toLowerCase() === typeFilter.toLowerCase())
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date()
      const startDate = new Date()

      switch (dateRange) {
        case "today":
          startDate.setHours(0, 0, 0, 0)
          break
        case "week":
          startDate.setDate(now.getDate() - 7)
          break
        case "month":
          startDate.setMonth(now.getMonth() - 1)
          break
        case "quarter":
          startDate.setMonth(now.getMonth() - 3)
          break
      }

      filtered = filtered.filter((tx) => new Date(tx.created_at) >= startDate)
    }

    setFilteredTransactions(filtered)
    setCurrentPage(1) // Reset to first page when filtering
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatShares = (shares: number) => {
    return Number(shares).toFixed(4)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NA", {
      style: "currency",
      currency: "NAD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      completed: "bg-green-500 hover:bg-green-600",
      pending: "bg-yellow-500 hover:bg-yellow-600",
      failed: "bg-red-500 hover:bg-red-600",
      cancelled: "bg-gray-500 hover:bg-gray-600",
      processing: "bg-blue-500 hover:bg-blue-600",
    }

    return (
      <Badge className={`${statusColors[status.toLowerCase()] || "bg-gray-500"} text-white text-xs px-2 py-1`}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  const getTransactionTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      purchase: "Purchase",
      vesting: "Vesting",
      claim: "Claim",
      buy_order_placed: "Buy Order",
      sell_order_placed: "Sell Order",
      shares_purchased: "Shares Bought",
      shares_sold: "Shares Sold",
      transfer: "Transfer",
      cashout: "Cashout",
      aft_purchase: "AFT Purchase",
      deposit: "Deposit",
      withdrawal: "Withdrawal",
    }
    return typeMap[type] || type.replace(/_/g, " ").toUpperCase()
  }

  const getTransactionTypeBadge = (type: string) => {
    const typeColors: Record<string, string> = {
      purchase: "bg-blue-100 text-blue-800 border-blue-200",
      vesting: "bg-purple-100 text-purple-800 border-purple-200",
      claim: "bg-green-100 text-green-800 border-green-200",
      buy_order_placed: "bg-indigo-100 text-indigo-800 border-indigo-200",
      sell_order_placed: "bg-orange-100 text-orange-800 border-orange-200",
      shares_purchased: "bg-emerald-100 text-emerald-800 border-emerald-200",
      shares_sold: "bg-amber-100 text-amber-800 border-amber-200",
      transfer: "bg-cyan-100 text-cyan-800 border-cyan-200",
      cashout: "bg-red-100 text-red-800 border-red-200",
      aft_purchase: "bg-pink-100 text-pink-800 border-pink-200",
    }

    return (
      <Badge
        variant="outline"
        className={`${typeColors[type] || "bg-gray-100 text-gray-800 border-gray-200"} text-xs font-medium`}
      >
        {getTransactionTypeDisplay(type)}
      </Badge>
    )
  }

  const getAmountDisplay = (transaction: Transaction) => {
    // For AFT transactions, show AFT units
    if (transaction.transaction_type === "aft_purchase" || transaction.description?.toLowerCase().includes("aft")) {
      return `${formatShares(transaction.shares || 0)} AFT`
    }
    // For share transactions, show shares
    if (transaction.shares && transaction.shares > 0) {
      return `${formatShares(transaction.shares)} Shares`
    }
    // For monetary transactions, show currency
    return formatCurrency(transaction.total_amount)
  }

  const getTransactionReference = (transaction: Transaction) => {
    // Use buy_ref for buy orders, sell_ref for sell orders, otherwise use reference_id
    if (transaction.transaction_type === "buy_order_placed" && transaction.buy_ref) {
      return transaction.buy_ref
    }
    if (transaction.transaction_type === "sell_order_placed" && transaction.sell_ref) {
      return transaction.sell_ref
    }
    return transaction.reference_id || "-"
  }

  const exportTransactions = () => {
    const csvContent = [
      ["Date", "Type", "Amount", "Value (N$)", "From", "To", "Status", "Description", "Reference"].join(","),
      ...filteredTransactions.map((tx) =>
        [
          formatDate(tx.created_at),
          getTransactionTypeDisplay(tx.transaction_type),
          getAmountDisplay(tx),
          formatCurrency(tx.total_amount),
          tx.from_wallet?.replace(/_/g, " ") || "-",
          tx.to_wallet?.replace(/_/g, " ") || "-",
          tx.status.toUpperCase(),
          `"${tx.description}"`,
          getTransactionReference(tx),
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex)

  if (loading) {
    return <TransactionTableSkeleton />
  }

  if (error) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-200">Transaction History</CardTitle>
          <CardDescription className="text-slate-400">Your recent transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-red-400">Error: {error}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-slate-200 text-xl">Transaction History</CardTitle>
            <CardDescription className="text-slate-400">
              Your complete transaction history and order activity
            </CardDescription>
          </div>
          <Button
            onClick={exportTransactions}
            variant="outline"
            size="sm"
            className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600 text-slate-200">
              <SelectItem value="all" className="text-slate-200">
                All Statuses
              </SelectItem>
              <SelectItem value="completed" className="text-slate-200">
                Completed
              </SelectItem>
              <SelectItem value="pending" className="text-slate-200">
                Pending
              </SelectItem>
              <SelectItem value="failed" className="text-slate-200">
                Failed
              </SelectItem>
              <SelectItem value="cancelled" className="text-slate-200">
                Cancelled
              </SelectItem>
              <SelectItem value="processing" className="text-slate-200">
                Processing
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600 text-slate-200">
              <SelectItem value="all" className="text-slate-200">
                All Types
              </SelectItem>
              <SelectItem value="purchase" className="text-slate-200">
                Purchase
              </SelectItem>
              <SelectItem value="vesting" className="text-slate-200">
                Vesting
              </SelectItem>
              <SelectItem value="claim" className="text-slate-200">
                Claim
              </SelectItem>
              <SelectItem value="buy_order_placed" className="text-slate-200">
                Buy Orders
              </SelectItem>
              <SelectItem value="sell_order_placed" className="text-slate-200">
                Sell Orders
              </SelectItem>
              <SelectItem value="shares_purchased" className="text-slate-200">
                Shares Bought
              </SelectItem>
              <SelectItem value="shares_sold" className="text-slate-200">
                Shares Sold
              </SelectItem>
              <SelectItem value="cashout" className="text-slate-200">
                Cashout
              </SelectItem>
              <SelectItem value="aft_purchase" className="text-slate-200">
                AFT Purchase
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600 text-slate-200">
              <SelectItem value="all" className="text-slate-200">
                All Time
              </SelectItem>
              <SelectItem value="today" className="text-slate-200">
                Today
              </SelectItem>
              <SelectItem value="week" className="text-slate-200">
                Last 7 Days
              </SelectItem>
              <SelectItem value="month" className="text-slate-200">
                Last Month
              </SelectItem>
              <SelectItem value="quarter" className="text-slate-200">
                Last 3 Months
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>
            Showing {currentTransactions.length} of {filteredTransactions.length} transactions
            {filteredTransactions.length !== transactions.length && ` (filtered from ${transactions.length} total)`}
          </span>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>
              {[
                searchTerm && "Search",
                statusFilter !== "all" && "Status",
                typeFilter !== "all" && "Type",
                dateRange !== "all" && "Date",
              ]
                .filter(Boolean)
                .join(", ") || "No filters"}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {filteredTransactions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-slate-400 text-lg mb-2">No transactions found</div>
              <div className="text-slate-500 text-sm">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all" || dateRange !== "all"
                  ? "Try adjusting your filters"
                  : "Your transactions will appear here"}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-slate-600 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-700">
                  <TableRow className="border-slate-600 hover:bg-slate-700">
                    <TableHead className="text-slate-300 font-semibold">Date & Time</TableHead>
                    <TableHead className="text-slate-300 font-semibold">Type</TableHead>
                    <TableHead className="text-slate-300 font-semibold">Amount</TableHead>
                    <TableHead className="text-slate-300 font-semibold">Value (N$)</TableHead>
                    <TableHead className="text-slate-300 font-semibold">From → To</TableHead>
                    <TableHead className="text-slate-300 font-semibold">Status</TableHead>
                    <TableHead className="text-slate-300 font-semibold">Description</TableHead>
                    <TableHead className="text-slate-300 font-semibold">Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTransactions.map((transaction, index) => (
                    <TableRow
                      key={transaction.id}
                      className={`border-slate-600 hover:bg-slate-700/50 ${
                        index % 2 === 0 ? "bg-slate-800" : "bg-slate-750"
                      }`}
                    >
                      <TableCell className="font-medium text-slate-200">
                        <div className="flex flex-col">
                          <span>{formatDate(transaction.created_at).split(",")[0]}</span>
                          <span className="text-xs text-slate-400">
                            {formatDate(transaction.created_at).split(",")[1]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getTransactionTypeBadge(transaction.transaction_type)}</TableCell>
                      <TableCell className="font-mono text-slate-200">{getAmountDisplay(transaction)}</TableCell>
                      <TableCell className="font-mono text-slate-200">
                        {formatCurrency(transaction.total_amount)}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="capitalize">{transaction.from_wallet?.replace(/_/g, " ") || "-"}</span>
                          <span className="text-slate-500">→</span>
                          <span className="capitalize">{transaction.to_wallet?.replace(/_/g, " ") || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate text-slate-300" title={transaction.description}>
                          {transaction.description}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        <div className="text-xs font-mono">{getTransactionReference(transaction)}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-slate-700 px-4 py-3 rounded-lg">
                <div className="text-sm text-slate-300">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of{" "}
                  {filteredTransactions.length} transactions
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={
                            currentPage === pageNum
                              ? "bg-blue-600 text-white"
                              : "bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500"
                          }
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
