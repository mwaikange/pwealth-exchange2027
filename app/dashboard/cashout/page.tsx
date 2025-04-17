"use client"

import { useState, useEffect } from "react"
import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { useWallet } from "@/contexts/wallet-context"
import { useTransactions } from "@/contexts/transaction-context"
import { TransactionTable } from "@/components/transaction-table"

export default function Cashout() {
  const [emailTransfer, setEmailTransfer] = useState("")
  const [pwtTokens, setPwtTokens] = useState("")
  const [usdValueTransfer, setUsdValueTransfer] = useState("")
  const [emailGift, setEmailGift] = useState("")
  const [usdValueGift, setUsdValueGift] = useState("")
  // Add error states for validation messages
  const [transferError, setTransferError] = useState("")
  const [giftError, setGiftError] = useState("")
  // Add success message states
  const [transferSuccess, setTransferSuccess] = useState("")
  const [giftSuccess, setGiftSuccess] = useState("")

  // Add useEffect for auto-clearing transfer messages
  useEffect(() => {
    let transferTimer: NodeJS.Timeout | null = null

    if (transferError || transferSuccess) {
      transferTimer = setTimeout(() => {
        setTransferError("")
        setTransferSuccess("")
      }, 5000) // 5 seconds
    }

    // Cleanup function
    return () => {
      if (transferTimer) clearTimeout(transferTimer)
    }
  }, [transferError, transferSuccess])

  // Add useEffect for auto-clearing gift messages
  useEffect(() => {
    let giftTimer: NodeJS.Timeout | null = null

    if (giftError || giftSuccess) {
      giftTimer = setTimeout(() => {
        setGiftError("")
        setGiftSuccess("")
      }, 5000) // 5 seconds
    }

    // Cleanup function
    return () => {
      if (giftTimer) clearTimeout(giftTimer)
    }
  }, [giftError, giftSuccess])

  // Get wallet balances and update functions from context
  const { pwtCashoutBalance, aftBalance, transferFromPwtCashout, transferFromAft } = useWallet()

  // Get transaction functions from context
  const { addTransaction, getCashoutTransactions } = useTransactions()

  // Get cashout transactions
  const cashoutTransactions = getCashoutTransactions()

  const currentUserEmail = "mwaikange@gmail.com" // Keep this for email validation

  const handleTransfer = () => {
    // Reset messages
    setTransferError("")
    setTransferSuccess("")

    // Validate email is not the user's own email
    if (emailTransfer.toLowerCase() === currentUserEmail.toLowerCase()) {
      setTransferError("You cannot transfer to your own account")
      return
    }

    // Validate token amount is positive
    const tokenAmount = Number(pwtTokens)
    if (isNaN(tokenAmount) || tokenAmount <= 0) {
      setTransferError("Please enter a positive token amount")
      return
    }

    // Validate sufficient balance in PWT Cashout wallet
    if (tokenAmount > pwtCashoutBalance) {
      setTransferError("Insufficient PWT Cashout balance for this transfer")
      return
    }

    // If all validations pass, proceed with transfer and update balance
    try {
      // Update the global wallet state
      transferFromPwtCashout(tokenAmount)

      // Log the transaction
      addTransaction({
        type: "OUT-TRANSFER",
        account: "PWT Cashout",
        amount: tokenAmount,
        amountUsd: tokenAmount * 10,
        recipient: emailTransfer,
        description: "OUT-TRANSFER",
      })

      // Show success message
      setTransferSuccess(`Successfully transferred ${tokenAmount} PWT to ${emailTransfer}`)

      // Clear form after successful transfer
      setPwtTokens("")
      setUsdValueTransfer("")
      setEmailTransfer("")

      console.log("Transfer completed successfully")
    } catch (error) {
      setTransferError("Transfer failed. Please try again.")
      console.error("Transfer error:", error)
    }
  }

  const handleGift = () => {
    // Reset messages
    setGiftError("")
    setGiftSuccess("")

    // Validate email is not the user's own email
    if (emailGift.toLowerCase() === currentUserEmail.toLowerCase()) {
      setGiftError("You cannot gift to your own account")
      return
    }

    // Validate USD amount is positive
    const usdAmount = Number(usdValueGift)
    if (isNaN(usdAmount) || usdAmount <= 0) {
      setGiftError("Please enter a positive USD amount")
      return
    }

    // Validate sufficient balance in AFT wallet (1 AFT = 1 USD)
    if (usdAmount > aftBalance) {
      setGiftError("Insufficient AFT balance for this gift")
      return
    }

    // If all validations pass, proceed with gift and update balance
    try {
      // Update the global wallet state
      transferFromAft(usdAmount)

      // Log the transaction
      addTransaction({
        type: "OUT-AFT GIFT",
        account: "AFT Wallet",
        amount: usdAmount,
        amountUsd: usdAmount,
        recipient: emailGift,
        description: "OUT-AFT GIFT",
      })

      // Show success message
      setGiftSuccess(`Successfully gifted ${usdAmount} AFT to ${emailGift}`)

      // Clear form after successful transfer
      setUsdValueGift("")
      setEmailGift("")

      console.log("Gift completed successfully")
    } catch (error) {
      setGiftError("Gift failed. Please try again.")
      console.error("Gift error:", error)
    }
  }

  return (
    <div className="h-[calc(100vh-130px)] bg-[#1c1e26] overflow-hidden">
      {/* Page Title */}
      <div className="px-6 pt-4 pb-2">
        <h1 className="text-2xl font-bold">Cashout</h1>
        <p className="text-gray-400 text-sm">Cashout by selling tokens & transferring them other users.</p>
      </div>

      {/* Main Content */}
      <div className="px-6 space-y-3">
        {/* Two Cards Side by Side */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Card - Transfer PWT/FIAT */}
          <div className="bg-[#2a2d3a] rounded-lg p-4">
            <h2 className="text-xl font-bold text-yellow-300 mb-1">TRANSFER - ( PWT / FIAT)</h2>
            <p className="text-green-500 text-xs mb-2">These transactions are irreversible please read T&C's</p>

            <p className="text-xs mb-2">
              Sell tokens in your local currency to friends, family, referrals and your social audience.
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={emailTransfer}
                onChange={(e) => {
                  setEmailTransfer(e.target.value)
                  // Clear messages when user starts typing
                  if (transferError) setTransferError("")
                  if (transferSuccess) setTransferSuccess("")
                }}
                placeholder="enter the email of receiving party"
                className="w-full p-2 rounded bg-[#f5f5f5] text-black text-sm border-0"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={pwtTokens}
                  onChange={(e) => {
                    // Only allow positive numbers
                    const value = e.target.value
                    if (value === "" || (/^\d*\.?\d*$/.test(value) && !value.startsWith("."))) {
                      setPwtTokens(value)
                      // Auto-calculate USD value based on token amount
                      const tokens = Number.parseFloat(value) || 0
                      setUsdValueTransfer(Math.floor(tokens * 10).toString())
                      // Clear messages when user starts typing
                      if (transferError) setTransferError("")
                      if (transferSuccess) setTransferSuccess("")
                    }
                  }}
                  placeholder="#Pwt Tokens"
                  className="w-full p-2 rounded bg-[#f5f5f5] text-black text-sm border-0"
                />
                <input
                  type="text"
                  value={usdValueTransfer}
                  readOnly
                  placeholder="USD Value"
                  className="w-full p-2 rounded bg-[#f5f5f5] text-black text-sm border-0 bg-gray-100"
                />
              </div>

              {/* Display error message if any */}
              {transferError && <p className="text-red-500 text-xs">{transferError}</p>}

              {/* Display success message if any */}
              {transferSuccess && <p className="text-green-500 text-xs">{transferSuccess}</p>}

              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-400">Available: {pwtCashoutBalance} PWT-Cashout</div>
                <button
                  onClick={handleTransfer}
                  className="bg-[#34a853] hover:bg-green-600 text-white font-medium py-1 px-6 rounded text-sm"
                >
                  TRANSFER
                </button>
              </div>
            </div>
          </div>

          {/* Right Card - Gift Activation Fee Tokens */}
          <div className="bg-[#2a2d3a] rounded-lg p-4">
            <h2 className="text-xl font-bold text-yellow-300 mb-1">GIFT ACTIVATION FEE TOKENS</h2>
            <p className="text-green-500 text-xs mb-2">These transactions are irreversible please read T&C's</p>

            <p className="text-xs mb-2">
              Sell or Gift Fee Tokens to your referrals or any member in your community. User email must be verified on
              database. 1 AFT token = 1 USD.
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={emailGift}
                onChange={(e) => {
                  setEmailGift(e.target.value)
                  // Clear messages when user starts typing
                  if (giftError) setGiftError("")
                  if (giftSuccess) setGiftSuccess("")
                }}
                placeholder="enter the email of the recieving party"
                className="w-full p-2 rounded bg-[#f5f5f5] text-black text-sm border-0"
              />

              <input
                type="text"
                value={usdValueGift}
                onChange={(e) => {
                  // Only allow positive numbers
                  const value = e.target.value
                  if (value === "" || (/^\d*\.?\d*$/.test(value) && !value.startsWith("."))) {
                    setUsdValueGift(value)
                    // Clear messages when user starts typing
                    if (giftError) setGiftError("")
                    if (giftSuccess) setGiftSuccess("")
                  }
                }}
                placeholder="USD Value (1 AFT = 1 USD)"
                className="w-full p-2 rounded bg-[#f5f5f5] text-black text-sm border-0"
              />

              {/* Display error message if any */}
              {giftError && <p className="text-red-500 text-xs">{giftError}</p>}

              {/* Display success message if any */}
              {giftSuccess && <p className="text-green-500 text-xs">{giftSuccess}</p>}

              <div className="flex justify-between items-center mt-[34px]">
                <div className="text-xs text-gray-400">Available: {aftBalance} AFT</div>
                <button
                  onClick={handleGift}
                  className="bg-[#34a853] hover:bg-green-600 text-white font-medium py-1 px-6 rounded text-sm"
                >
                  TRANSFER
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-[#2a2d3a] rounded-lg overflow-hidden">
          <div className="flex justify-between items-center px-4 py-2">
            <h3 className="text-xs font-medium">Recent Cashout Transactions</h3>
            <Link href="/dashboard/transactions">
              <ChevronRight className="h-4 w-4 text-gray-400 hover:text-white cursor-pointer" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <TransactionTable transactions={cashoutTransactions} showAccount={true} compact={true} />
          </div>
        </div>
      </div>
    </div>
  )
}
