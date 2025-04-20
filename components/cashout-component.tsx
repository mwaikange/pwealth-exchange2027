"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useWallet } from "@/contexts/wallet-context"
import { supabase } from "@/lib/supabase-singleton"

export function CashoutComponent() {
  const { user } = useAuth()
  const { balances } = useWallet()

  const [recipientEmail, setRecipientEmail] = useState("")
  const [amount, setAmount] = useState("")
  const [tokenType, setTokenType] = useState("PWT-Cashout")
  const [isValidEmail, setIsValidEmail] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")

  // Check if email exists and is confirmed in the database
  const checkEmail = async (email: string) => {
    if (!email) {
      setIsValidEmail(null)
      return
    }

    // Don't allow sending to own email
    if (user && email === user.email) {
      setIsValidEmail(false)
      setMessage("You cannot send tokens to your own email address")
      return
    }

    setIsLoading(true)
    try {
      // Check if the email exists and is confirmed in auth.users
      const { data, error } = await supabase
        .from("auth.users")
        .select("email, email_confirmed_at")
        .eq("email", email)
        .single()

      if (error) {
        console.error("Error checking email:", error)
        setIsValidEmail(false)
        setMessage("User not found")
      } else if (data && data.email_confirmed_at) {
        setIsValidEmail(true)
        setMessage("Valid recipient")
      } else {
        setIsValidEmail(false)
        setMessage("User email not confirmed")
      }
    } catch (error) {
      console.error("Error:", error)
      setIsValidEmail(false)
      setMessage("Error checking email")
    } finally {
      setIsLoading(false)
    }
  }

  // Debounce email check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (recipientEmail) {
        checkEmail(recipientEmail)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [recipientEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate amount
    const numAmount = Number.parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setMessage("Please enter a valid amount")
      return
    }

    // Check if user has enough balance
    const availableBalance = tokenType === "PWT-Cashout" ? balances.pwtCashout : balances.activationToken

    if (numAmount > availableBalance) {
      setMessage(`Insufficient ${tokenType} balance`)
      return
    }

    // Check if recipient email is valid
    if (!isValidEmail) {
      setMessage("Please enter a valid recipient email")
      return
    }

    // Process the transaction
    setIsLoading(true)
    try {
      // Transaction logic would go here

      // Success message
      setMessage(`Successfully sent ${numAmount} ${tokenType} to ${recipientEmail}`)

      // Reset form
      setRecipientEmail("")
      setAmount("")
      setTokenType("PWT-Cashout")
      setIsValidEmail(null)
    } catch (error) {
      console.error("Error processing transaction:", error)
      setMessage("Error processing transaction")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full bg-[#1c1e26] overflow-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Cashout</h1>

      <div className="bg-[#2a2d3a] rounded-lg p-6 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">Transfer Tokens</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Recipient Email</label>
            <div className="relative">
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className={`w-full p-2 bg-[#1e2130] border ${
                  isValidEmail === true
                    ? "border-green-500"
                    : isValidEmail === false
                      ? "border-red-500"
                      : "border-gray-600"
                } rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500`}
                placeholder="recipient@example.com"
                required
              />
              {isLoading && (
                <div className="absolute right-3 top-2.5">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
            {isValidEmail !== null && (
              <p className={`text-xs mt-1 ${isValidEmail ? "text-green-500" : "text-red-500"}`}>{message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Token Type</label>
            <select
              value={tokenType}
              onChange={(e) => setTokenType(e.target.value)}
              className="w-full p-2 bg-[#1e2130] border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="PWT-Cashout">PWT-Cashout</option>
              <option value="AFT">Activation Token (AFT)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 bg-[#1e2130] border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="0.00"
              step="0.01"
              min="0.01"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Available: {tokenType === "PWT-Cashout" ? balances.pwtCashout : balances.activationToken} {tokenType}
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isValidEmail}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
          >
            {isLoading ? "Processing..." : "Send Tokens"}
          </button>

          {message && !isValidEmail && <p className="text-center text-sm text-yellow-500 mt-2">{message}</p>}
        </form>
      </div>
    </div>
  )
}
