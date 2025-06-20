"use client"

import type React from "react"

import { useState, useEffect } from "react"

import { useWallet } from "@/contexts/WalletContext"
import { formatCurrency } from "@/lib/utils"

interface MobilePaymentFormConnectorProps {
  amount: number
  onPaymentSuccess: () => void
  onPaymentError: (error: string) => void
}

const MobilePaymentFormConnector: React.FC<MobilePaymentFormConnectorProps> = ({
  amount,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const {/* formatCurrency */} = useWallet() // Removed formatCurrency from wallet context
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "success" | "error">("idle")

  useEffect(() => {
    const createPayment = async () => {
      setPaymentStatus("pending")
      try {
        // Simulate creating a payment URL (replace with your actual API call)
        const response = await fetch("/api/create-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        setPaymentUrl(data.paymentUrl)
        // Simulate success after a delay (replace with actual payment verification)
        setTimeout(() => {
          setPaymentStatus("success")
          onPaymentSuccess()
        }, 3000)
      } catch (error: any) {
        console.error("Payment creation error:", error)
        setPaymentStatus("error")
        onPaymentError(error.message || "Payment failed")
      }
    }

    createPayment()
  }, [amount, onPaymentSuccess, onPaymentError])

  return (
    <div>
      {paymentStatus === "pending" && <p>Processing payment...</p>}
      {paymentStatus === "success" && <p>Payment successful!</p>}
      {paymentStatus === "error" && <p>Payment failed. Please try again.</p>}
      {paymentUrl && (
        <a href={paymentUrl} target="_blank" rel="noopener noreferrer">
          Open Payment Link
        </a>
      )}
      <p>Amount: {formatCurrency(amount)}</p>
    </div>
  )
}

export default MobilePaymentFormConnector
