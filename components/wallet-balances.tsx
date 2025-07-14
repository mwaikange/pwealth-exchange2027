"use client"

import { useState } from "react"
import { useWallet } from "@/contexts/wallet-context"
import { AFTPurchaseModal } from "./aft-purchase-modal"
import { Loader2, Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react" // Import Lucide icons

export function WalletBalances() {
  const { buyWalletBalance, holdWalletPreHold, holdWalletPostHold, cashoutWalletBalance, aftBalance, loading, error } =
    useWallet()
  const [isAftModalOpen, setIsAftModalOpen] = useState(false)

  // Helper function to format shares to 4 decimal places
  const formatShares = (value: number): string => {
    return Number(value)
      .toFixed(4)
      .replace(/\.?0+$/, "")
  }

  // Helper function to format currency
  const formatCurrency = (value: number): string => {
    return `N$${Number(value).toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        {/* Loading skeletons */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[#4a4d5a] rounded-md px-2 py-1 flex flex-col items-center min-w-[120px]">
            <div className="flex items-center justify-center h-3 mb-1">
              <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
            </div>
            <div className="text-xl font-bold w-full h-6 bg-gray-600 animate-pulse rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2">
        <div className="bg-red-600 rounded-md px-3 py-2 text-white text-sm">Error loading wallets: {error}</div>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Buy Wallet Box */}
      <div className="bg-[#4a4d5a] rounded-md px-2 py-1 flex flex-col items-center min-w-[120px]">
        <div className="flex items-center text-[10px] text-gray-300">
          <TrendingUp className="w-3 h-3 mr-1 text-blue-400" /> {/* Lucide Icon */}
          Buy Wallet
        </div>
        <div className="text-xl font-bold">{formatCurrency(buyWalletBalance)}</div>
      </div>

      {/* Hold Pre-Hold Box */}
      <div className="bg-[#4a4d5a] rounded-md px-2 py-1 flex flex-col items-center min-w-[120px]">
        <div className="flex items-center text-[10px] text-gray-300">
          <Wallet className="w-3 h-3 mr-1 text-green-400" /> {/* Lucide Icon */}
          Hold Pre
        </div>
        <div className="text-xl font-bold">{formatShares(holdWalletPreHold)}</div>
        <div className="text-[8px] text-gray-400">shares</div>
      </div>

      {/* Hold Post-Hold Box */}
      <div className="bg-[#4a4d5a] rounded-md px-2 py-1 flex flex-col items-center min-w-[120px]">
        <div className="flex items-center text-[10px] text-gray-300">
          <TrendingDown className="w-3 h-3 mr-1 text-purple-400" /> {/* Lucide Icon */}
          Hold Post
        </div>
        <div className="text-xl font-bold">{formatShares(holdWalletPostHold)}</div>
        <div className="text-[8px] text-gray-400">shares</div>
      </div>

      {/* Cashout Wallet Box */}
      <div className="bg-[#4a4d5a] rounded-md px-2 py-1 flex flex-col items-center min-w-[120px]">
        <div className="flex items-center text-[10px] text-gray-300">
          <DollarSign className="w-3 h-3 mr-1 text-orange-400" /> {/* Lucide Icon */}
          Cashout
        </div>
        <div className="text-xl font-bold">{formatCurrency(cashoutWalletBalance)}</div>
      </div>

      {/* Activation Token Box (if still used) */}
      {aftBalance > 0 && (
        <div className="bg-[#4a4d5a] rounded-md px-2 py-1 flex flex-col items-center min-w-[120px]">
          <div className="flex items-center text-[10px] text-gray-300">
            <Wallet className="w-3 h-3 mr-1" /> {/* Lucide Icon */}
            Activation Token
          </div>
          <div className="text-xl font-bold flex items-center">{formatCurrency(aftBalance)}</div>
          <button
            onClick={() => setIsAftModalOpen(true)}
            className="mt-1 text-[10px] bg-yellow-500 text-black px-2 py-0.5 rounded-sm hover:bg-yellow-600"
          >
            Top Up
          </button>
        </div>
      )}

      {/* AFT Purchase Modal */}
      <AFTPurchaseModal isOpen={isAftModalOpen} onClose={() => setIsAftModalOpen(false)} />
    </div>
  )
}
