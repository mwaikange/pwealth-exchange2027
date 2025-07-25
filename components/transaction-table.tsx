"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase-singleton"
import { useAuth } from "@/contexts/auth-context"
import { formatCurrency } from "@/lib/utils"

interface Transaction {
  id: string
  user_uuid: string
  transaction_type: string
  amount: number
  shares?: number
  description: string
  status: string
  created_at: string
  reference_id?: string
}

export function TransactionTable() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchTransactions()
    }
  }, [user])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_uuid", user?.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setTransactions(data || [])
    } catch (err: any) {
      console.error("Error fetching transactions:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
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

  const formatAmount = (transaction: Transaction) => {
    // For share-related transactions, show shares
    if (transaction.shares && transaction.shares > 0) {
      // Check if it's an AFT transaction
      if (transaction.description?.toLowerCase().includes("aft")) {
        return `${transaction.shares.toFixed(4)} AFT`
      }
      return `${transaction.shares.toFixed(4)} Shares`
    }

    // For monetary transactions, show currency
    return formatCurrency(transaction.amount)
  }

  const getAmountColumnHeader = () => {
    return "Amount (Shares)"
  }

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
            <div className="text-red-500">Error loading transactions: {error}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Your recent transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">No transactions found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">{getAmountColumnHeader()}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{transaction.transaction_type.replace(/_/g, " ").toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(transaction)}</TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {transaction.reference_id ? (
                        <span className="truncate block max-w-24">{transaction.reference_id}</span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
