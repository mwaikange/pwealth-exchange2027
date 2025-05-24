"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MobileLayout } from "@/components/mobile/mobile-layout"
import { useTransactions } from "@/contexts/transaction-context"
import { useMobile } from "@/hooks/use-mobile"
import { X } from "lucide-react"
import dynamic from "next/dynamic"

const MobileTransactionsContent = dynamic(() => import("@/components/mobile/mobile-transactions-content"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1d29] via-[#2a2d3a] to-[#1a1d29] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <div>Loading Transactions...</div>
      </div>
    </div>
  ),
})

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
        <MobileTransactionsContent transactions={transactions} />
      </div>
    </MobileLayout>
  )
}
