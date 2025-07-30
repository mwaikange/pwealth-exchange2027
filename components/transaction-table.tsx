"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Download, Filter, Search, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface Transaction {
  id: string
  transaction_type: "buy" | "sell" | "deposit" | "withdrawal" | "vesting" | "claim"
  shares: number
  price_per_share: number
  total_amount: number
  status: "pending" | "completed" | "failed" | "cancelled"
  created_at: string
  buy_ref?: string
  sell_ref?: string
  reference?: string
  description?: string
}

export function TransactionTable() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()

  const fetchTransactions = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Fetch from multiple sources and combine
      const [buyOrders, sellOrders, userTransactions] = await Promise.all([
        supabase
          .from("buy_orders")
          .select("id, shares, price_per_share, total_amount, status, created_at, buy_ref")
          .eq("user_uuid", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("sell_orders")
          .select("id, shares, price_per_share, total_amount, status, created_at, sell_ref")
          .eq("user_uuid", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("user_transactions")
          .select("*")
          .eq("user_uuid", user.id)
          .order("created_at", { ascending: false }),
      ])

      const combinedTransactions: Transaction[] = []

      // Add buy orders
      if (buyOrders.data) {
        buyOrders.data.forEach((order) => {
          combinedTransactions.push({
            id: order.id,
            transaction_type: "buy",
            shares: Number(order.shares) || 0,
            price_per_share: Number(order.price_per_share) || 0,
            total_amount: Number(order.total_amount) || 0,
            status: order.status as any,
            created_at: order.created_at,
            buy_ref: order.buy_ref,
            reference: order.buy_ref,
            description: `Buy order: ${order.buy_ref || "N/A"}`,
          })
        })
      }

      // Add sell orders
      if (sellOrders.data) {
        sellOrders.data.forEach((order) => {
          combinedTransactions.push({
            id: order.id,
            transaction_type: "sell",
            shares: Number(order.shares) || 0,
            price_per_share: Number(order.price_per_share) || 0,
            total_amount: Number(order.total_amount) || 0,
            status: order.status as any,
            created_at: order.created_at,
            sell_ref: order.sell_ref,
            reference: order.sell_ref,
            description: `Sell order: ${order.sell_ref || "N/A"}`,
          })
        })
      }

      // Add user transactions
      if (userTransactions.data) {
        userTransactions.data.forEach((transaction) => {
          combinedTransactions.push({
            id: transaction.id,
            transaction_type: transaction.transaction_type,
            shares: Number(transaction.shares) || 0,
            price_per_share: Number(transaction.price_per_share) || 0,
            total_amount: Number(transaction.total_amount) || 0,
            status: transaction.status,
            created_at: transaction.created_at,
            reference: transaction.reference,
            description: transaction.description,
          })
        })
      }

      // Sort by date (newest first)
      combinedTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setTransactions(combinedTransactions)
    } catch (err: any) {
      console.error("Error fetching transactions:", err)
      setError(err.message || "Failed to fetch transactions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [user])

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        transaction.reference?.toLowerCase().includes(searchLower) ||
        transaction.description?.toLowerCase().includes(searchLower) ||
        transaction.transaction_type.toLowerCase().includes(searchLower) ||
        transaction.id.toLowerCase().includes(searchLower)

      if (!matchesSearch) return false
    }

    // Status filter
    if (statusFilter !== "all" && transaction.status !== statusFilter) {
      return false
    }

    // Type filter
    if (typeFilter !== "all" && transaction.transaction_type !== typeFilter) {
      return false
    }

    // Date filters
    if (dateFrom && new Date(transaction.created_at) < dateFrom) {
      return false
    }
    if (dateTo && new Date(transaction.created_at) > dateTo) {
      return false
    }

    return true
  })

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-500 text-yellow-50 hover:bg-yellow-600",
      completed: "bg-green-500 text-green-50 hover:bg-green-600",
      failed: "bg-red-500 text-red-50 hover:bg-red-600",
      cancelled: "bg-gray-500 text-gray-50 hover:bg-gray-600",
    }
    return (
      <Badge className={variants[status as keyof typeof variants] || "bg-gray-500 text-gray-50"}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  const getTypeBadge = (type: string) => {
    const variants = {
      buy: "bg-blue-500 text-blue-50 hover:bg-blue-600",
      sell: "bg-orange-500 text-orange-50 hover:bg-orange-600",
      deposit: "bg-green-500 text-green-50 hover:bg-green-600",
      withdrawal: "bg-red-500 text-red-50 hover:bg-red-600",
      vesting: "bg-purple-500 text-purple-50 hover:bg-purple-600",
      claim: "bg-teal-500 text-teal-50 hover:bg-teal-600",
    }
    return (
      <Badge className={variants[type as keyof typeof variants] || "bg-gray-500 text-gray-50"}>
        {type.toUpperCase()}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NA", {
      style: "currency",
      currency: "NAD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatShares = (shares: number) => {
    return Number(shares).toFixed(4)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy HH:mm")
  }

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Transaction History</CardTitle>
          <CardDescription>Loading your transaction history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-700 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Transaction History</CardTitle>
          <CardDescription className="text-red-400">Error: {error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchTransactions} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800 border-slate-700 shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white text-xl">Transaction History</CardTitle>
            <CardDescription className="text-slate-400">View and filter your transaction history</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={fetchTransactions}
              variant="outline"
              size="sm"
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-slate-700 rounded-lg">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-600 border-slate-500 text-slate-200 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-slate-600 border-slate-500 text-slate-200 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600 shadow-xl">
              <SelectItem value="all" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                All Statuses
              </SelectItem>
              <SelectItem value="pending" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                Pending
              </SelectItem>
              <SelectItem value="completed" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                Completed
              </SelectItem>
              <SelectItem value="failed" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                Failed
              </SelectItem>
              <SelectItem value="cancelled" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                Cancelled
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-slate-600 border-slate-500 text-slate-200 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600 shadow-xl">
              <SelectItem value="all" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                All Types
              </SelectItem>
              <SelectItem value="buy" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                Buy Orders
              </SelectItem>
              <SelectItem value="sell" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                Sell Orders
              </SelectItem>
              <SelectItem value="deposit" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                Deposits
              </SelectItem>
              <SelectItem value="withdrawal" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                Withdrawals
              </SelectItem>
              <SelectItem value="vesting" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                Vesting
              </SelectItem>
              <SelectItem value="claim" className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
                Claims
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Date From */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500",
                  !dateFrom && "text-slate-400",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "MMM dd, yyyy") : "From date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-slate-700 border-slate-600" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
                className="bg-slate-700 text-slate-200"
              />
            </PopoverContent>
          </Popover>

          {/* Date To */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500",
                  !dateTo && "text-slate-400",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "MMM dd, yyyy") : "To date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-slate-700 border-slate-600" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
                className="bg-slate-700 text-slate-200"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </span>
          {(searchTerm || statusFilter !== "all" || typeFilter !== "all" || dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                setStatusFilter("all")
                setTypeFilter("all")
                setDateFrom(undefined)
                setDateTo(undefined)
              }}
              className="text-slate-400 hover:text-slate-200"
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Transaction Table */}
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 p-4 bg-slate-700 rounded-t-lg text-sm font-medium text-slate-300 border-b border-slate-600">
              <div>Date</div>
              <div>Type</div>
              <div>Reference</div>
              <div>Shares</div>
              <div>Price/Share</div>
              <div>Total</div>
              <div>Status</div>
            </div>

            {/* Table Body */}
            <div className="bg-slate-800 rounded-b-lg">
              {filteredTransactions.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No transactions found</p>
                  <p className="text-sm">Try adjusting your filters or search terms</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {filteredTransactions.map((transaction, index) => (
                    <div
                      key={transaction.id}
                      className={cn(
                        "grid grid-cols-7 gap-4 p-4 text-sm hover:bg-slate-700 transition-colors",
                        index % 2 === 0 ? "bg-slate-800" : "bg-slate-750",
                      )}
                    >
                      <div className="text-slate-300">{formatDate(transaction.created_at)}</div>
                      <div>{getTypeBadge(transaction.transaction_type)}</div>
                      <div className="text-slate-300 font-mono text-xs">
                        {transaction.reference || transaction.buy_ref || transaction.sell_ref || "N/A"}
                      </div>
                      <div className="text-slate-300 font-medium">{formatShares(transaction.shares)}</div>
                      <div className="text-slate-300">{formatCurrency(transaction.price_per_share)}</div>
                      <div className="text-slate-100 font-medium">{formatCurrency(transaction.total_amount)}</div>
                      <div>{getStatusBadge(transaction.status)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
