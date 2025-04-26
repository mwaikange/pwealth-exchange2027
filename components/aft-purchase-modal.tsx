"use client"

import type React from "react"

import { useState } from "react"
import { X, Loader2 } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import { useWallet } from "@/contexts/wallet-context"
import { useTransactions } from "@/contexts/transaction-context"
import { useAuth } from "@/contexts/auth-context"

interface AFTPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AFTPurchaseModal({ isOpen, onClose }: AFTPurchaseModalProps) {
  const [amount, setAmount] = useState("50")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isBelowMinimum, setIsBelowMinimum] = useState(false)
  const { user } = useAuth()
  const { aftBalance, receiveAft } = useWallet()
  const { addTransaction } = useTransactions()

  if (!isOpen) return null

  // Update the handleAmountChange function to allow users to type freely
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow positive numbers
    const value = e.target.value.replace(/[^\d]/g, "")

    // Check if below minimum
    const numericValue = Number.parseInt(value) || 0
    setIsBelowMinimum(numericValue > 0 && numericValue < 50)

    // Only enforce max limit during typing
    if (numericValue > 10000) {
      setAmount("10000") // Maximum
    } else {
      setAmount(value) // Allow any value including empty string
    }
  }

  // Update the handleBuyAFT function to enforce minimum amount at purchase time
  const handleBuyAFT = async () => {
    try {
      const numericAmount = Number.parseInt(amount) || 0
      if (numericAmount < 50) {
        setIsBelowMinimum(true)
        setIsProcessing(false)
        return
      }

      setIsProcessing(true)
      console.log("Starting payment process...")

      if (!user || !user.email) {
        throw new Error("User must be logged in to make a purchase")
      }

      if (numericAmount > 10000) {
        throw new Error("Amount must be between $50 and $10,000")
      }

      console.log(`Initiating payment for ${numericAmount} USD`)

      // Generate a unique order ID
      const orderId = uuidv4()

      // Call our internal API to handle the PayGate.to integration
      const response = await fetch("/api/paygate/initiate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: numericAmount,
          email: user.email,
          orderId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to initiate payment")
      }

      const data = await response.json()
      console.log("Payment URL generated:", data.paymentUrl)

      // Open payment page in a new tab (rather than redirecting the current page)
      window.open(data.paymentUrl, "_blank")

      // Close the modal after successful payment URL generation
      onClose()
    } catch (error) {
      console.error("Payment initiation error:", error)
      alert(`Payment error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2a2d3a] rounded-lg w-[400px] overflow-hidden">
        <div className="bg-yellow-500 px-4 py-2 flex justify-between items-center">
          <h3 className="text-black font-semibold">Buy Activation Fee Tokens (AFT)</h3>
          <button onClick={onClose} className="text-black hover:text-gray-700" disabled={isProcessing}>
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
                <span className="text-sm text-yellow-500">Balance: {aftBalance} USD</span>
              </div>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={amount}
                  onChange={handleAmountChange}
                  className="bg-[#4a4d5a] rounded px-2 py-1 w-full text-right"
                  disabled={isProcessing}
                />
                <span className="bg-[#4a4d5a] rounded px-2 py-1 text-sm">USD</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <div className="flex items-center">
                  <span>Min: $50.00</span>
                  {isBelowMinimum && <span className="ml-2 text-red-500">Please check Minim</span>}
                </div>
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
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-md py-2"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleBuyAFT}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-md py-2 flex items-center justify-center"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Buy AFT"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
