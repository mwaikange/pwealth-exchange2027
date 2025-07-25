"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Transaction {
  id: string
  transaction_type: string
  shares: number
  total_amount: number
  from_wallet: string
  to_wallet: string
  status: string
  description: string
  created_at: string
}

interface TransactionTableProps {
  transactions: Transaction[]
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.ceil(transactions.length / itemsPerPage)

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentTransactions = transactions.slice(startIndex, endIndex)

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
    const statusColors = {
      completed: "bg-green-500",
      pending: "bg-yellow-500",
      failed: "bg-red-500",
      cancelled: "bg-gray-500",
    }

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-500"}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  const getTransactionTypeDisplay = (type: string) => {
    const typeMap = {
      purchase: "Purchase",
      vesting: "Vesting",
      claim: "Claim",
      exchange_buy: "Exchange Buy",
      exchange_sell: "Exchange Sell",
      transfer: "Transfer",
      cashout: "Cashout",
      aft_purchase: "AFT Purchase",
    }
    return typeMap[type as keyof typeof typeMap] || type
  }

  const getAmountDisplay = (transaction: Transaction) => {
    // For AFT transactions, show AFT units
    if (transaction.transaction_type === "aft_purchase") {
      return `${formatShares(transaction.shares)} AFT`
    }
    // For all other transactions, show shares
    return `${formatShares(transaction.shares)} Shares`
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-700">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700">
              <TableHead className="text-slate-300">Date</TableHead>
              <TableHead className="text-slate-300">Type</TableHead>
              <TableHead className="text-slate-300">Amount (Shares)</TableHead>
              <TableHead className="text-slate-300">Value (N$)</TableHead>
              <TableHead className="text-slate-300">From</TableHead>
              <TableHead className="text-slate-300">To</TableHead>
              <TableHead className="text-slate-300">Status</TableHead>
              <TableHead className="text-slate-300">Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              currentTransactions.map((transaction) => (
                <TableRow key={transaction.id} className="border-slate-700">
                  <TableCell className="text-slate-300">{formatDate(transaction.created_at)}</TableCell>
                  <TableCell className="text-slate-300">
                    {getTransactionTypeDisplay(transaction.transaction_type)}
                  </TableCell>
                  <TableCell className="text-slate-300">{getAmountDisplay(transaction)}</TableCell>
                  <TableCell className="text-slate-300">{formatCurrency(transaction.total_amount)}</TableCell>
                  <TableCell className="text-slate-300 capitalize">
                    {transaction.from_wallet?.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="text-slate-300 capitalize">
                    {transaction.to_wallet?.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                  <TableCell className="text-slate-300 max-w-xs truncate">{transaction.description}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            Showing {startIndex + 1} to {Math.min(endIndex, transactions.length)} of {transactions.length} transactions
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="border-slate-600 text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm text-slate-300">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="border-slate-600 text-slate-300"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
