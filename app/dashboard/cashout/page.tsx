"use client"

import { useState, useEffect } from "react"
import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { useWallet } from "@/contexts/wallet-context"
import { useTransactions } from "@/contexts/transaction-context"
import { TransactionTable } from "@/components/transaction-table"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

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
  // Add loading states
  const [isCheckingTransferEmail, setIsCheckingTransferEmail] = useState(false)
  const [isCheckingGiftEmail, setIsCheckingGiftEmail] = useState(false)
  // Add validation states
  const [isTransferEmailValid, setIsTransferEmailValid] = useState(false)
  const [isGiftEmailValid, setIsGiftEmailValid] = useState(false)
  // Add loading states for transfers
  const [isTransferring, setIsTransferring] = useState(false)
  const [isGifting, setIsGifting] = useState(false)
  // Add confirmation modal states
  const [showTransferConfirmation, setShowTransferConfirmation] = useState(false)
  const [showGiftConfirmation, setShowGiftConfirmation] = useState(false)
  const [pendingTransferAmount, setPendingTransferAmount] = useState(0)
  const [pendingGiftAmount, setPendingGiftAmount] = useState(0)

  // Get current user from auth context
  const { user } = useAuth()
  const currentUserEmail = user?.email || ""

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

  // Get wallet balances from context
  const { pwtCashoutBalance, aftBalance, loading: walletLoading } = useWallet()

  // Get transaction functions from context
  const { getCashoutTransactions, loading: transactionsLoading } = useTransactions()

  // Get cashout transactions
  const cashoutTransactions = getCashoutTransactions()

  // Function to check if email exists in database and is confirmed
  const checkEmailExists = async (email: string) => {
    try {
      // First check if this is the user's own email
      if (email.toLowerCase() === currentUserEmail.toLowerCase()) {
        return { exists: false, isOwnEmail: true }
      }

      // Check in app_users table for confirmed users
      const { data, error } = await supabase
        .from("app_users")
        .select("email")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle() // Use maybeSingle instead of single to avoid errors

      if (error) {
        console.error("Error checking app user:", error)
        return { exists: false, isOwnEmail: false }
      }

      return { exists: !!data, isOwnEmail: false }
    } catch (error) {
      console.error("Error in checkEmailExists:", error)
      return { exists: false, isOwnEmail: false }
    }
  }

  // Handle transfer email change with validation
  const handleTransferEmailChange = (email: string) => {
    setEmailTransfer(email)
    // Clear messages when user starts typing
    if (transferError) setTransferError("")
    if (transferSuccess) setTransferSuccess("")
  }

  // New function to handle blur event for transfer email
  const handleTransferEmailBlur = async () => {
    // Only validate if there's an email and it looks like a valid email format
    if (emailTransfer && emailTransfer.includes("@")) {
      setIsCheckingTransferEmail(true)
      setIsTransferEmailValid(false)

      try {
        const { exists, isOwnEmail } = await checkEmailExists(emailTransfer)

        if (isOwnEmail) {
          setTransferError("You cannot transfer to your own account")
          setIsTransferEmailValid(false)
        } else if (!exists) {
          setTransferError("Recipient not found or email not confirmed")
          setIsTransferEmailValid(false)
        } else {
          setIsTransferEmailValid(true)
          setTransferError("")
        }
      } catch (error) {
        console.error("Error checking email:", error)
        setTransferError("Error validating email. Please try again.")
        setIsTransferEmailValid(false)
      } finally {
        setIsCheckingTransferEmail(false)
      }
    } else if (emailTransfer) {
      // If there's text but not a valid email format
      setTransferError("Please enter a valid email address")
      setIsTransferEmailValid(false)
    }
  }

  // Handle gift email change with validation
  const handleGiftEmailChange = (email: string) => {
    setEmailGift(email)
    // Clear messages when user starts typing
    if (giftError) setGiftError("")
    if (giftSuccess) setGiftSuccess("")
  }

  // New function to handle blur event for gift email
  const handleGiftEmailBlur = async () => {
    // Only validate if there's an email and it looks like a valid email format
    if (emailGift && emailGift.includes("@")) {
      setIsCheckingGiftEmail(true)
      setIsGiftEmailValid(false)

      try {
        const { exists, isOwnEmail } = await checkEmailExists(emailGift)

        if (isOwnEmail) {
          setGiftError("You cannot gift to your own account")
          setIsGiftEmailValid(false)
        } else if (!exists) {
          setGiftError("Recipient not found or email not confirmed")
          setIsGiftEmailValid(false)
        } else {
          setIsGiftEmailValid(true)
          setGiftError("")
        }
      } catch (error) {
        console.error("Error checking email:", error)
        setGiftError("Error validating email. Please try again.")
        setIsGiftEmailValid(false)
      } finally {
        setIsCheckingGiftEmail(false)
      }
    } else if (emailGift) {
      // If there's text but not a valid email format
      setGiftError("Please enter a valid email address")
      setIsGiftEmailValid(false)
    }
  }

  const handleTransfer = async () => {
    // Reset messages
    setTransferError("")
    setTransferSuccess("")

    // Validate email is not the user's own email
    if (emailTransfer.toLowerCase() === currentUserEmail.toLowerCase()) {
      setTransferError("You cannot transfer to your own account")
      return
    }

    // Validate email exists in system
    if (!isTransferEmailValid) {
      setTransferError("Recipient not found or email not confirmed")
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

    // Show confirmation modal instead of alert
    setPendingTransferAmount(tokenAmount)
    setShowTransferConfirmation(true)
  }

  // New function to handle the actual transfer after confirmation
  const processTransfer = async () => {
    try {
      setIsTransferring(true)
      setShowTransferConfirmation(false)

      // Call the transfer_tokens RPC function
      const { data, error } = await supabase.rpc("transfer_tokens", {
        sender_uuid: user?.id,
        recipient_email: emailTransfer,
        token_type: "PWT",
        amount: pendingTransferAmount,
        transaction_type: "OUT-TRANSFER",
        description: "OUT-PWT Transfer",
      })

      if (error) {
        console.error("Transfer error:", error)
        setTransferError(`Transfer failed: ${error.message}`)
        return
      }

      if (!data.success) {
        setTransferError(`Transfer failed: ${data.message}`)
        return
      }

      // Show success message
      setTransferSuccess(`Successfully transferred ${pendingTransferAmount} PWT to ${emailTransfer}`)

      // Clear form after successful transfer
      setPwtTokens("")
      setUsdValueTransfer("")
      setEmailTransfer("")
      setIsTransferEmailValid(false)

      // Refresh wallet balances and transactions
      window.location.reload()
    } catch (error: any) {
      setTransferError(`Transfer failed: ${error.message}`)
      console.error("Transfer error:", error)
    } finally {
      setIsTransferring(false)
    }
  }

  const handleGift = async () => {
    // Reset messages
    setGiftError("")
    setGiftSuccess("")

    // Validate email is not the user's own email
    if (emailGift.toLowerCase() === currentUserEmail.toLowerCase()) {
      setGiftError("You cannot gift to your own account")
      return
    }

    // Validate email exists in system
    if (!isGiftEmailValid) {
      setGiftError("Recipient not found or email not confirmed")
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

    // Show confirmation modal instead of alert
    setPendingGiftAmount(usdAmount)
    setShowGiftConfirmation(true)
  }

  // New function to handle the actual gift after confirmation
  const processGift = async () => {
    try {
      setIsGifting(true)
      setShowGiftConfirmation(false)

      // Call the transfer_tokens RPC function
      const { data, error } = await supabase.rpc("transfer_tokens", {
        sender_uuid: user?.id,
        recipient_email: emailGift,
        token_type: "AFT",
        amount: pendingGiftAmount,
        transaction_type: "OUT-AFT GIFT",
        description: "AFT Gift",
      })

      if (error) {
        console.error("Gift error:", error)
        setGiftError(`Gift failed: ${error.message}`)
        return
      }

      if (!data.success) {
        setGiftError(`Gift failed: ${data.message}`)
        return
      }

      // Show success message
      setGiftSuccess(`Successfully gifted ${pendingGiftAmount} AFT to ${emailGift}`)

      // Clear form after successful transfer
      setUsdValueGift("")
      setEmailGift("")
      setIsGiftEmailValid(false)

      // Refresh wallet balances and transactions
      window.location.reload()
    } catch (error: any) {
      setGiftError(`Gift failed: ${error.message}`)
      console.error("Gift error:", error)
    } finally {
      setIsGifting(false)
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
              <div className="relative">
                <input
                  type="text"
                  value={emailTransfer}
                  onChange={(e) => handleTransferEmailChange(e.target.value)}
                  onBlur={handleTransferEmailBlur}
                  placeholder="enter the email of receiving party"
                  className={`w-full p-2 rounded ${
                    isTransferEmailValid ? "bg-green-100 text-green-800" : "bg-[#f5f5f5] text-black"
                  } text-sm border-0`}
                  disabled={isTransferring}
                />
                {isCheckingTransferEmail && (
                  <div className="absolute right-2 top-2 text-xs text-gray-500">Checking...</div>
                )}
              </div>

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
                  disabled={isTransferring}
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
                  disabled={!isTransferEmailValid || !pwtTokens || isTransferring}
                >
                  {isTransferring ? "PROCESSING..." : "TRANSFER"}
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
              <div className="relative">
                <input
                  type="text"
                  value={emailGift}
                  onChange={(e) => handleGiftEmailChange(e.target.value)}
                  onBlur={handleGiftEmailBlur}
                  placeholder="enter the email of the recieving party"
                  className={`w-full p-2 rounded ${
                    isGiftEmailValid ? "bg-green-100 text-green-800" : "bg-[#f5f5f5] text-black"
                  } text-sm border-0`}
                  disabled={isGifting}
                />
                {isCheckingGiftEmail && <div className="absolute right-2 top-2 text-xs text-gray-500">Checking...</div>}
              </div>

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
                disabled={isGifting}
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
                  disabled={!isGiftEmailValid || !usdValueGift || isGifting}
                >
                  {isGifting ? "PROCESSING..." : "TRANSFER"}
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
      {/* Confirmation Modals */}
      {showTransferConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#2a2d3a] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Confirm Transfer</h3>
            <p className="mb-6">
              Please ensure that this email - <span className="font-bold text-yellow-300">{emailTransfer}</span> - is
              the correct email address to which the transfer is being made. This transaction is irreversible.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowTransferConfirmation(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
              >
                Cancel
              </button>
              <button
                onClick={processTransfer}
                className="px-4 py-2 bg-[#34a853] hover:bg-green-600 rounded text-white"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {showGiftConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#2a2d3a] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Confirm Gift</h3>
            <p className="mb-6">
              Please ensure that this email - <span className="font-bold text-yellow-300">{emailGift}</span> - is the
              correct email address to which the gift is being made. This transaction is irreversible.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowGiftConfirmation(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
              >
                Cancel
              </button>
              <button onClick={processGift} className="px-4 py-2 bg-[#34a853] hover:bg-green-600 rounded text-white">
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
