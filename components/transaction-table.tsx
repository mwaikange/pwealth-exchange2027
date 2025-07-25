"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"

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
}

export function TransactionTable() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    if (user) {
      fetchTransactions()
    }
  }, [user])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Fetching transaction history...")

      // Try to fetch from share_transactions table first
      const { data: shareTransactions, error: shareError } = await supabase
        .from("share_transactions")
        .select("*")
        .eq("user_uuid", user?.id)
        .order("created_at", { ascending: false })
        .limit(100)

      if (shareError) {
        console.error("Error fetching share transactions:", shareError)
        // Fallback to generic transactions table if it exists
        const { data: genericTransactions, error: genericError } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_uuid", user?.id)
          .order("created_at", { ascending: false })
          .limit(100)

        if (genericError) {
          throw new Error("Failed to fetch transactions: " + genericError.message)
        }

        setTransactions(genericTransactions || [])
      } else {
        // Format share transactions data
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
        }))

        setTransactions(formattedTransactions)
      }

      console.log("✅ Transactions loaded:", transactions.length)
    } catch (err: any) {
      console.error("❌ Error fetching transactions:", err)
      setError(err.message || "Failed to fetch transactions")
    } finally {
      setLoading(false)
    }
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
      completed: "bg-green-500",
      pending: "bg-yellow-500",
      failed: "bg-red-500",
      cancelled: "bg-gray-500",
    }

    return (
      <Badge className={`${statusColors[status.toLowerCase()] || "bg-gray-500"} text-white`}>
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
    }
    return typeMap[type] || type.replace(/_/g, " ").toUpperCase()
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

  // Pagination
  const totalPages = Math.ceil(transactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentTransactions = transactions.slice(startIndex, endIndex)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your recent transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading transactions...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your recent transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-red-500">Error: {error}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Your recent transactions and order activity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {transactions.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">No transactions found</div>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Value (N$)</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{formatDate(transaction.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTransactionTypeDisplay(transaction.transaction_type)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{getAmountDisplay(transaction)}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(transaction.total_amount)}</TableCell>
                      <TableCell className="capitalize">{transaction.from_wallet?.replace(/_/g, " ") || "-"}</TableCell>
                      <TableCell className="capitalize">{transaction.to_wallet?.replace(/_/g, " ") || "-"}</TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, transactions.length)} of {transactions.length}{" "}
                  transactions
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
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
