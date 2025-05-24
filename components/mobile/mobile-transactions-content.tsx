"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useTransactions } from "@/contexts/transaction-context"
import { useMobile } from "@/hooks/use-mobile"
import { Home, BarChart3, DollarSign, FileText, Settings, LogOut } from "lucide-react"

export default function MobileTransactionsContent() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [showNotification, setShowNotification] = useState(true)
  const authContext = useAuth()
  const transactionContext = useTransactions()
  const user = authContext?.user
  const signOut = authContext?.signOut || (async () => {})
  const transactions = transactionContext?.transactions || []
  const isMobile = useMobile()

  useEffect(() => {
    setMounted(true)
    if (!isMobile && mounted) {
      router.push("/dashboard/transactions")
    }
  }, [isMobile, router, mounted])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1d29] via-[#2a2d3a] to-[#1a1d29] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <div>Loading...</div>
        </div>
      </div>
    )
  }

  const userEmail = user?.email || "demo@peer-wealth.com"
  const referralCode = user?.user_metadata?.referral_code || "RFRL-89069"

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      router.push("/login")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1d29] via-[#2a2d3a] to-[#1a1d29] text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">👤</span>
          </div>
          <div>
            <div className="text-sm font-medium">{userEmail}</div>
            <div className="text-xs text-gray-400">{referralCode}</div>
          </div>
        </div>
        <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium">
          TOP UP
          <br />
          Activation Fee
        </button>
      </div>

      {/* Notification */}
      {showNotification && (
        <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-3 m-4 relative">
          <button
            onClick={() => setShowNotification(false)}
            className="absolute top-2 right-2 text-blue-400 hover:text-blue-300"
          >
            ×
          </button>
          <div className="text-sm">
            <strong>Note:</strong> To view complete transaction data, please log in from a laptop/PC.
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="p-4">
        <div className="bg-[#2a2d3a] rounded-lg p-4">
          <h2 className="text-lg font-medium mb-4">Transaction History</h2>

          {/* Table Header */}
          <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-400 mb-3 pb-2 border-b border-gray-600">
            <div>Description</div>
            <div>Date</div>
            <div>Peer-Email</div>
            <div>USD Amount</div>
          </div>

          {/* Transaction Rows */}
          <div className="space-y-2">
            {transactions.length > 0 ? (
              transactions.slice(0, 10).map((transaction, index) => (
                <div key={index} className="grid grid-cols-4 gap-2 text-xs py-2 border-b border-gray-700">
                  <div className="truncate">{transaction.description || transaction.type}</div>
                  <div className="text-gray-400">{new Date(transaction.created_at).toLocaleDateString()}</div>
                  <div className="truncate text-gray-400">
                    {transaction.sender_email || transaction.recipient_email || "N/A"}
                  </div>
                  <div className="text-green-400">${transaction.usd_amount || "0.00"}</div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-8">
                <div className="text-4xl mb-2">📄</div>
                <div>No transactions found</div>
                <div className="text-xs mt-1">Your transaction history will appear here</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#2a2d3a] border-t border-gray-700">
        <div className="flex justify-around py-2">
          <button
            onClick={() => router.push("/mobile/home")}
            className="flex flex-col items-center p-2 text-gray-400 hover:text-white"
          >
            <Home size={20} />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button
            onClick={() => router.push("/mobile/vesting")}
            className="flex flex-col items-center p-2 text-gray-400 hover:text-white"
          >
            <BarChart3 size={20} />
            <span className="text-xs mt-1">Vesting</span>
          </button>
          <button
            onClick={() => router.push("/mobile/cashout")}
            className="flex flex-col items-center p-2 text-gray-400 hover:text-white"
          >
            <DollarSign size={20} />
            <span className="text-xs mt-1">Cashout</span>
          </button>
          <button
            onClick={() => router.push("/mobile/transactions")}
            className="flex flex-col items-center p-2 text-white"
          >
            <FileText size={20} />
            <span className="text-xs mt-1">Transactions</span>
          </button>
          <button
            onClick={() => router.push("/mobile/settings")}
            className="flex flex-col items-center p-2 text-gray-400 hover:text-white"
          >
            <Settings size={20} />
            <span className="text-xs mt-1">Settings</span>
          </button>
          <button onClick={handleSignOut} className="flex flex-col items-center p-2 text-red-400 hover:text-red-300">
            <LogOut size={20} />
            <span className="text-xs mt-1">Logout</span>
          </button>
        </div>
      </div>

      {/* Bottom padding to account for fixed navigation */}
      <div className="h-20"></div>
    </div>
  )
}
