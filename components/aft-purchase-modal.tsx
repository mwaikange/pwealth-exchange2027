"use client"

import { useState } from "react"
import { X } from "lucide-react"

interface AFTPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AFTPurchaseModal({ isOpen, onClose }: AFTPurchaseModalProps) {
  const [amount, setAmount] = useState("100")

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2a2d3a] rounded-lg w-[400px] overflow-hidden">
        <div className="bg-yellow-500 px-4 py-2 flex justify-between items-center">
          <h3 className="text-black font-semibold">Buy Activation Fee Tokens (AFT)</h3>
          <button onClick={onClose} className="text-black hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <p className="text-sm text-gray-300 mb-2">
              Purchase AFT tokens to activate your account features and services.
            </p>
            <div className="bg-[#1c1e26] p-3 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">Amount (USD)</span>
                <span className="text-sm text-yellow-500">Balance: $0.00</span>
              </div>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-[#4a4d5a] rounded px-2 py-1 w-full text-right"
                />
                <span className="bg-[#4a4d5a] rounded px-2 py-1 text-sm">USD</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Min: $10.00</span>
                <span>Max: $10,000.00</span>
              </div>
            </div>
          </div>

          <div className="bg-[#1c1e26] p-3 rounded-md mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm">You will receive</span>
              <span className="text-sm text-green-500">{amount} AFT</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Rate</span>
              <span>1 AFT = 1 USD</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-md py-2">
              Cancel
            </button>
            <button className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-md py-2">
              Buy AFT
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
