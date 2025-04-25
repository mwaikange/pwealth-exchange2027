"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useWallet } from "@/contexts/wallet-context"
import { useTransactions } from "@/contexts/transaction-context"
import { useAuth } from "@/contexts/auth-context"

export default function PaymentConfirmationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const { receiveAft } = useWallet()
  const { addTransaction } = useTransactions()

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [amount, setAmount] = useState<number | null>(null)

  useEffect(() => {
    async function processPayment() {
      try {
        // Get params from URL
        const orderId = searchParams.get("orderId")
        const value_coin = searchParams.get("value_coin")
        const txid_in = searchParams.get("txid_in")
        const txid_out = searchParams.get("txid_out")
        const address_in = searchParams.get("address_in")
        const amountParam = searchParams.get("amount")

        console.log("Payment confirmation params:", { orderId, value_coin, txid_in, txid_out, address_in, amountParam })

        // If we don't have transaction details from PayGate yet, this could be the initial redirect
        if (!txid_in && !txid_out) {
          if (!orderId || !amountParam) {
            throw new Error("Missing order details")
          }

          // Just show a processing message since the callback hasn't happened yet
          setStatus("loading")
          setMessage("Your payment is being processed. Please do not close this window.")
          setAmount(Number.parseFloat(amountParam))
          return
        }

        // We have transaction details, process the payment
        if (!orderId || !value_coin || !txid_in || !txid_out) {
          throw new Error("Incomplete payment details")
        }

        // Get the amount in USD - this should be the same as the USDC amount
        const aftAmount = Number.parseFloat(value_coin)
        setAmount(aftAmount)

        if (isNaN(aftAmount) || aftAmount <= 0) {
          throw new Error("Invalid payment amount")
        }

        // Verify the payment in our database
        const verifyResponse = await fetch("/api/paygate/verify-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
            txid_in,
            txid_out,
            value_coin,
            address_in,
          }),
        })

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json()
          throw new Error(errorData.error || "Failed to verify payment")
        }

        // Payment verified, credit the user's AFT balance
        if (user) {
          // Add AFT to the user's balance
          await receiveAft(aftAmount)

          // Record the transaction
          await addTransaction({
            type: "AFT-TopUP",
            account: "AFT Wallet",
            amount: aftAmount,
            amountUsd: aftAmount,
            description: "Top-up via Moonpay",
          })

          setStatus("success")
          setMessage(
            `Your payment of ${aftAmount} USDC was successful. ${aftAmount} AFT has been added to your account.`,
          )
        } else {
          throw new Error("User not logged in")
        }
      } catch (error) {
        console.error("Payment confirmation error:", error)
        setStatus("error")
        setMessage(`Payment verification failed: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    processPayment()
  }, [searchParams, user, receiveAft, addTransaction])

  const handleReturn = () => {
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-[#1c1e26] flex items-center justify-center text-white p-4">
      <div className="bg-[#2a2d3a] rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          {status === "loading" && (
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          )}
          {status === "success" && (
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {status === "error" && (
            <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}

          <h2 className="text-2xl font-bold mb-2">
            {status === "loading" && "Processing Payment"}
            {status === "success" && "Payment Successful"}
            {status === "error" && "Payment Failed"}
          </h2>

          <p className="text-gray-300 mb-4">{message}</p>

          {status === "success" && amount && (
            <div className="bg-[#1c1e26] p-4 rounded-md mb-4">
              <div className="flex justify-between items-center">
                <span>Amount:</span>
                <span className="font-bold">{amount} USDC</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span>AFT Received:</span>
                <span className="font-bold text-green-500">{amount} AFT</span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleReturn}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-medium py-2 rounded-md"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  )
}
