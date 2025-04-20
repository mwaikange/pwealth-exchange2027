"use client"

import { TopBar } from "./Header"
import { WalletBalances } from "./wallet-balances"
import { useState } from "react"
import { X } from "lucide-react"

interface HeaderWithWalletProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export function HeaderWithWallet({ sidebarOpen, setSidebarOpen }: HeaderWithWalletProps) {
  const [showTopUpModal, setShowTopUpModal] = useState(false)

  return (
    <div className="flex items-center justify-between px-4 h-[64px] bg-[#2a2d3a] border-b border-gray-700 w-full">
      <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex items-center space-x-4">
        <WalletBalances />
        <button
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
          onClick={() => setShowTopUpModal(true)}
        >
          <div className="font-bold">Top Up</div>
          <div className="text-xs">Activation Token (AFT)</div>
        </button>
      </div>

      {/* Top Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#2a2d3a] rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Purchase Activation Tokens</h2>
              <button onClick={() => setShowTopUpModal(false)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm mb-2">Enter amount to purchase (minimum $50):</label>
                <div className="flex items-center">
                  <span className="bg-gray-700 px-3 py-2 rounded-l-md">$</span>
                  <input
                    type="number"
                    min="50"
                    defaultValue="50"
                    className="bg-gray-800 text-white px-3 py-2 rounded-r-md w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Minimum purchase amount is $50 USD</p>
              </div>

              <div>
                <label className="block text-sm mb-2">Payment method:</label>
                <button className="w-full bg-gray-800 hover:bg-gray-700 py-3 px-4 rounded-md flex items-center justify-center">
                  <span className="mr-2">💳</span>
                  Credit Card
                </button>
              </div>

              <button className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-md font-medium">
                Proceed to Payment
              </button>

              <p className="text-xs text-center text-gray-400">By proceeding, you agree to our Terms and Conditions.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
