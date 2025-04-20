"use client"

import { useState } from "react"
import { ChevronLeft, X } from "lucide-react"
import { useWallet } from "@/contexts/wallet-context"
import { useTransactions } from "@/contexts/transaction-context"
import { useAuth } from "@/contexts/auth-context"
import { NotificationBell } from "./notification-bell"
import Link from "next/link"

export function DashboardHeader() {
  const { pwtInvestBalance, pwtCashoutBalance, aftBalance, loading, updateAftBalance } = useWallet()
  const { addTransaction } = useTransactions()
  const { user } = useAuth()

  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState("50")
  const [isProcessing, setIsProcessing] = useState(false)
  const [topUpError, setTopUpError] = useState("")
  const [topUpSuccess, setTopUpSuccess] = useState("")

  const handleTopUp = async () => {
    // Validate amount
    const amount = Number(topUpAmount)
    if (isNaN(amount) || amount < 50) {
      setTopUpError("Minimum amount is $50")
      return
    }

    setTopUpError("")
    setIsProcessing(true)

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Update AFT balance
      await updateAftBalance(amount, "add")

      // Log transaction
      await addTransaction({
        type: "BUY-AFT RECEIPT",
        account: "AFT Wallet",
        amount: amount,
        amountUsd: amount,
        description: "AFT Top-Up",
      })

      setTopUpSuccess(`Successfully purchased ${amount} AFT tokens`)

      // Close modal after success
      setTimeout(() => {
        setShowTopUpModal(false)
        setTopUpSuccess("")
      }, 2000)
    } catch (error) {
      console.error("Top-up error:", error)
      setTopUpError("Failed to process payment. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="w-full">
      {/* Main header */}
      <header className="bg-[#1e2130] h-[60px] flex items-center px-4">
        <div className="flex items-center">
          <div className="w-10 h-10 relative mr-3">
            <img
              src="/peerWealth_Cursor.png"
              alt="Peer Wealth Logo"
              className="absolute inset-0 rounded-full w-full h-full object-cover"
            />
          </div>
          <Link href="/dashboard" className="flex items-center">
            <ChevronLeft className="h-5 w-5 mr-2" />
            <h1 className="text-xl font-bold">OVERVIEW</h1>
          </Link>
        </div>

        <div className="ml-auto flex items-center space-x-3">
          <NotificationBell />

          <div className="flex items-center space-x-2">
            <div className="bg-[#2a2d3a] rounded px-3 py-1.5 flex flex-col items-center min-w-[100px]">
              <div className="text-xs text-gray-400">PWT Invest</div>
              <div className="text-xl font-bold">{loading ? "..." : pwtInvestBalance}</div>
            </div>

            <div className="bg-[#2a2d3a] rounded px-3 py-1.5 flex flex-col items-center min-w-[100px]">
              <div className="text-xs text-gray-400">PWT Cashout</div>
              <div className="text-xl font-bold">{loading ? "..." : pwtCashoutBalance}</div>
            </div>

            <div className="bg-[#2a2d3a] rounded px-3 py-1.5 flex flex-col items-center min-w-[100px]">
              <div className="text-xs text-gray-400">Activation Token</div>
              <div className="text-xl font-bold">
                {loading ? "..." : aftBalance} <span className="text-xs">USD</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowTopUpModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            <div className="font-medium text-sm">Top Up</div>
            <div className="text-xs">Activation Token (AFT)</div>
          </button>
        </div>
      </header>

      {/* Notification slider */}
      <div className="bg-green-600 py-1.5 px-4 text-white whitespace-nowrap overflow-hidden">
        <div className="animate-marquee">
          Join Our Telegram Group Today | Add Our Whatsapp Channel - Check Your Settings Page | Registration Alert -
          Namibia- Welcome! | Cashout Alert - Namibia - 50 USD - Well Done!
        </div>
      </div>

      {/* Top Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1e2130] rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowTopUpModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold mb-6">Purchase Activation Tokens</h2>

            <div className="mb-6">
              <label className="block text-sm mb-2">Enter amount to purchase (minimum $50):</label>
              <div className="flex items-center">
                <span className="bg-gray-700 px-3 py-2 rounded-l-md">$</span>
                <input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  min="50"
                  className="bg-gray-800 text-white px-3 py-2 rounded-r-md w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Minimum purchase amount is $50 USD</p>

              {topUpError && <p className="text-red-500 text-sm mt-2">{topUpError}</p>}

              {topUpSuccess && <p className="text-green-500 text-sm mt-2">{topUpSuccess}</p>}
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Payment method:</h3>
              <button className="w-full bg-gray-800 hover:bg-gray-700 py-3 px-4 rounded flex items-center justify-center">
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M2 10H22" stroke="currentColor" strokeWidth="2" />
                </svg>
                Credit Card
              </button>
            </div>

            <button
              onClick={handleTopUp}
              disabled={isProcessing}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded font-medium"
            >
              {isProcessing ? "Processing..." : "Proceed to Payment"}
            </button>

            <p className="text-xs text-center text-gray-400 mt-4">
              By proceeding, you agree to our Terms and Conditions.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
