"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MobileLayout } from "@/components/mobile/mobile-layout"
import { useTransactions } from "@/contexts/transaction-context"
import { useMobile } from "@/hooks/use-mobile"
import { X } from "lucide-react"

export default function MobileTransactionsPage() {
  const router = useRouter()
  const isMobile = useMobile()
  const { transactions } = useTransactions()
  const [showNotice, setShowNotice] = useState(true)

  // Redirect to desktop version if not on mobile
  useEffect(() => {
    if (!isMobile) {
      router.push("/dashboard/transactions")
    }
  }, [isMobile, router])

  return (
    <MobileLayout currentPage="transactions">
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Transaction History</h1>

        {/* Notice popup */}
        {showNotice && (
          <div className="bg-blue-500/20 border border-blue-500 rounded p-3 mb-4 relative">
            <button className="absolute top-2 right-2 text-gray-400" onClick={() => setShowNotice(false)}>
              <X size={16} />
            </button>
            <p className="text-sm">To view complete transaction data, please log in from a Laptop/PC.</p>
          </div>
        )}

        {/* Transactions table */}
        <div className="bg-[#2a2d3a] rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="py-2 px-2 text-left">Description</th>
                <th className="py-2 px-2 text-left">Date</th>
                <th className="py-2 px-2 text-left">Peer-Email</th>
                <th className="py-2 px-2 text-right">USD Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-700">
                    <td className="py-2 px-2">{tx.description}</td>
                    <td className="py-2 px-2">{tx.date}</td>
                    <td className="py-2 px-2 text-xs">{tx.sender || tx.recipient || "System"}</td>
                    <td className="py-2 px-2 text-right">${tx.amountUsd || "0.00"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-400">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MobileLayout>
  )
}
