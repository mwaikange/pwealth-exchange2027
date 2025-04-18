"use client"

import { useWallet } from "@/contexts/wallet-context"

export function WalletBalances() {
  const { pwtInvestBalance, pwtCashoutBalance, aftBalance, loading } = useWallet()

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        {/* Loading skeletons */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#4a4d5a] rounded-md px-2 py-1 flex flex-col items-center min-w-[120px]">
            <div className="flex items-center text-[10px] text-gray-300 w-full h-3 bg-gray-600 animate-pulse rounded mb-1"></div>
            <div className="text-xl font-bold w-full h-6 bg-gray-600 animate-pulse rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      {/* PWT Invest Box */}
      <div className="bg-[#4a4d5a] rounded-md px-2 py-1 flex flex-col items-center min-w-[120px]">
        <div className="flex items-center text-[10px] text-gray-300">
          <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 6H21M5 6V20H19V6M8 6V4H16V6M10 10H14M10 14H14M10 18H14"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          PWT Invest
        </div>
        <div className="text-xl font-bold">{pwtInvestBalance}</div>
      </div>

      {/* PWT Cashout Box */}
      <div className="bg-[#4a4d5a] rounded-md px-2 py-1 flex flex-col items-center min-w-[120px]">
        <div className="flex items-center text-[10px] text-gray-300">
          <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 6H21M5 6V20H19V6M8 6V4H16V6M10 10H14M10 14H14M10 18H14"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          PWT Cashout
        </div>
        <div className="text-xl font-bold">{pwtCashoutBalance}</div>
      </div>

      {/* Activation Token Box */}
      <div className="bg-[#4a4d5a] rounded-md px-2 py-1 flex flex-col items-center min-w-[120px]">
        <div className="flex items-center text-[10px] text-gray-300">
          <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 6H21M5 6V20H19V6M8 6V4H16V6M10 10H14M10 14H14M10 18H14"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Activation Token
        </div>
        <div className="text-xl font-bold flex items-center">
          {aftBalance} <span className="text-[10px] ml-1">USD</span>
        </div>
      </div>
    </div>
  )
}
