"use client"

import type React from "react"

import { useState } from "react"
import { X, Loader2, ArrowLeft } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import { useWallet } from "@/contexts/wallet-context"
import { useTransactions } from "@/contexts/transaction-context"
import { useAuth } from "@/contexts/auth-context"
import { getFriendlyErrorMessage } from "@/utils/error-handling"

interface AFTPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AFTPurchaseModal({ isOpen, onClose }: AFTPurchaseModalProps) {
  const [amount, setAmount] = useState("50")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isBelowMinimum, setIsBelowMinimum] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { user } = useAuth()
  const { aftBalance, receiveAft } = useWallet()
  const { addTransaction } = useTransactions()
  const [currentView, setCurrentView] = useState<"form" | "paymentOptions" | "qrCode" | "mobilePayments">("form")
  const [selectedCountry, setSelectedCountry] = useState("namibia")
  const [screenshotUploaded, setScreenshotUploaded] = useState(false)

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
  const handleBuyAFT = () => {
    const numericAmount = Number.parseInt(amount) || 0
    if (numericAmount < 50) {
      setIsBelowMinimum(true)
      return
    }

    // Clear any previous error messages
    setErrorMessage(null)

    // Show payment options instead of processing payment
    setCurrentView("paymentOptions")
  }

  const handleCardPayment = async () => {
    try {
      setIsProcessing(true)
      setErrorMessage(null)
      console.log("Starting card payment process...")

      if (!user || !user.email) {
        throw new Error("User must be logged in to make a purchase")
      }

      const numericAmount = Number.parseInt(amount) || 0
      if (numericAmount < 50 || numericAmount > 10000) {
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

      // Use our friendly error message utility
      const friendlyMessage = getFriendlyErrorMessage(error)
      setErrorMessage(friendlyMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleQRCodePayment = () => {
    // Clear any previous error messages
    setErrorMessage(null)

    // Show QR code view
    setCurrentView("qrCode")
  }

  const handleMobileWalletPayment = () => {
    // Clear any previous error messages
    setErrorMessage(null)

    // Show mobile payments view
    setCurrentView("mobilePayments")
  }

  const handleBackToForm = () => {
    setErrorMessage(null)
    setCurrentView("form")
  }

  const handleBackToPaymentOptions = () => {
    setErrorMessage(null)
    setCurrentView("paymentOptions")
  }

  const handleSubmitMobilePayment = () => {
    // In a real implementation, this would submit the payment details
    console.log("Mobile payment submitted")

    // Close the modal
    onClose()
  }

  // Generate a random reference number for the QR code
  // In a real implementation, this would come from your backend
  const referenceNumber = "9588883402"

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCountry(e.target.value)
  }

  const getCurrencyCode = (country: string) => {
    switch (country) {
      case "namibia":
        return "NAD"
      case "south_africa":
        return "ZAR"
      case "botswana":
        return "Pula"
      default:
        return "USD"
    }
  }

  // Get exchange rate based on country
  const getExchangeRate = (country: string) => {
    switch (country) {
      case "namibia":
        return 18.5 // 1 USD = 18.5 NAD (example rate)
      case "south_africa":
        return 19.2 // 1 USD = 19.2 ZAR (example rate)
      case "botswana":
        return 13.7 // 1 USD = 13.7 Pula (example rate)
      default:
        return 1 // Default to 1:1 for USD
    }
  }

  // Calculate local currency amount rounded to nearest 10
  const calculateLocalAmount = () => {
    const usdAmount = Number.parseInt(amount) || 0
    const exchangeRate = getExchangeRate(selectedCountry)
    const exactLocalAmount = usdAmount * exchangeRate
    const roundedLocalAmount = Math.round(exactLocalAmount / 10) * 10
    return roundedLocalAmount.toString()
  }

  // Get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const day = String(today.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScreenshotUploaded(e.target.files && e.target.files.length > 0)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className={`bg-[#2a2d3a] rounded-lg ${currentView === "mobilePayments" ? "w-[1040px] max-h-[90vh] overflow-y-auto" : "w-[400px]"} overflow-hidden`}
      >
        <div className="bg-yellow-500 px-4 py-2 flex justify-between items-center">
          <h3 className="text-black font-semibold">Buy Activation Fee Tokens (AFT)</h3>
          <button onClick={onClose} className="text-black hover:text-gray-700" disabled={isProcessing}>
            <X size={20} />
          </button>
        </div>

        {/* Error message display */}
        {errorMessage && (
          <div className="bg-red-500/20 border border-red-500 mx-4 mt-4 px-3 py-2 rounded text-white text-sm">
            {errorMessage}
          </div>
        )}

        {currentView === "form" && (
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
        )}

        {currentView === "paymentOptions" && (
          <div className="p-4">
            <h4 className="text-lg font-medium text-center mb-4">Select Payment Method</h4>
            <p className="text-sm text-gray-300 mb-4 text-center">
              You will purchase {amount} AFT for ${amount} USD
            </p>

            <div className="space-y-3 mb-4">
              <button
                onClick={handleQRCodePayment}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md py-3 flex items-center justify-center"
                disabled={isProcessing}
              >
                Scan QR Code
              </button>

              <button
                className="w-full bg-gray-500 text-white font-medium rounded-md py-3 flex items-center justify-center opacity-70 cursor-not-allowed"
                disabled={true}
              >
                Mobile/E-Wallet Payments
              </button>

              <button
                onClick={handleCardPayment}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-md py-3 flex items-center justify-center"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Pay with Card"
                )}
              </button>
            </div>

            <button
              onClick={handleBackToForm}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white rounded-md py-2"
              disabled={isProcessing}
            >
              Back
            </button>
          </div>
        )}

        {currentView === "qrCode" && (
          <div className="bg-gradient-to-b from-blue-500 to-cyan-500 p-4 flex flex-col items-center">
            <div className="mb-4 flex w-full">
              <button onClick={handleBackToPaymentOptions} className="text-white hover:text-gray-200">
                <ArrowLeft size={20} />
              </button>
            </div>

            <div className="bg-white rounded-full p-4 mb-6">
              <div className="text-blue-500 font-bold text-2xl">TelkomPay</div>
            </div>

            <div className="bg-white p-4 rounded-lg w-64 flex flex-col items-center mb-6">
              <div className="mb-2">
                {/* Using direct img tag instead of Next.js Image component */}
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-dv1HKx1lO7KdTR9lpRajqDovCQAckU.png"
                  alt="QR Code for payment"
                  width="200"
                  height="200"
                  style={{ display: "block", maxWidth: "100%" }}
                />
              </div>
              <div className="text-black text-lg font-medium">{referenceNumber}</div>
            </div>

            <div className="bg-black text-white p-2 w-64 flex items-center justify-center rounded-t-none rounded-b-lg -mt-6">
              <div className="mr-2">Pay with</div>
              <div className="text-red-500 font-bold">
                <span className="border border-red-500 px-1">□□</span>
              </div>
              <div className="ml-2 text-white">scan to pay</div>
            </div>

            <div className="text-white text-xl font-bold mt-6 text-center">
              Scan with your bank app
              <br />
              or Scan to Pay app
            </div>
          </div>
        )}

        {currentView === "mobilePayments" && (
          <div className="bg-[#2D3440] p-6">
            <div className="mb-4 flex w-full">
              <button onClick={handleBackToPaymentOptions} className="text-white hover:text-gray-200">
                <ArrowLeft size={20} />
              </button>
            </div>

            <div className="grid grid-cols-[35fr_65fr] gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white text-sm block mb-1">Country</label>
                    <select
                      className="bg-[#D9D9D9] rounded p-2 w-full text-black"
                      value={selectedCountry}
                      onChange={handleCountryChange}
                    >
                      <option value="namibia">Namibia</option>
                      <option value="south_africa" disabled className="text-gray-400">
                        South Africa
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="text-white text-sm block mb-1">Bank</label>
                    <input type="text" className="bg-[#D9D9D9] rounded p-2 w-full text-black" />
                  </div>
                </div>

                <div>
                  <label className="text-white text-sm block mb-1">Amount (USD) - local conversion below.</label>
                  <input
                    type="text"
                    className="bg-[#D9D9D9] rounded p-2 w-full text-black font-medium text-lg"
                    value={amount}
                    readOnly
                  />
                </div>

                <div className="border-t border-yellow-400 pt-4">
                  <p className="text-white text-sm mb-2">Make payment to this number:</p>
                  <div className="bg-[#D9D9D9] rounded-md p-3 mb-2">
                    <p className="text-black text-4xl font-bold text-center">085 8007296</p>
                  </div>
                  <p className="text-white text-sm mb-4">
                    Network: <span className="font-semibold">Telecom Namibia</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white text-xs block mb-1">
                      Name
                      <span className="block text-xs opacity-70">
                        (exactly as it Appears on recipients SMS - Full Name if Required)
                      </span>
                    </label>
                    <input type="text" className="bg-[#D9D9D9] rounded p-2 w-full text-sm text-black" />
                  </div>
                  <div>
                    <label className="text-white text-xs block mb-1">
                      Date of Transaction
                      <span className="block text-xs opacity-70">
                        (Must be Today - the transaction must be made the day of submission)
                      </span>
                    </label>
                    <input
                      type="date"
                      className="bg-[#D9D9D9] rounded p-2 w-full text-sm text-black"
                      value={getCurrentDate()}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="text-white text-xs block mb-1">Reference Number</label>
                    <input type="text" className="bg-[#D9D9D9] rounded p-2 w-full text-sm text-black" />
                  </div>
                  <div>
                    <label className="text-white text-xs block mb-1">Amount ({getCurrencyCode(selectedCountry)})</label>
                    <input
                      type="text"
                      className="bg-[#D9D9D9] rounded p-2 w-full text-sm text-black"
                      value={calculateLocalAmount()}
                      readOnly
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-white text-xs block mb-1">Mobile Number</label>
                    <input type="text" className="bg-[#D9D9D9] rounded p-2 w-full text-sm h-[34px] text-black" />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-white text-xs block mb-1">Upload Screenshot</label>
                    <div className="bg-[#D9D9D9] rounded p-0 w-full h-[34px] flex items-center justify-center overflow-hidden">
                      <input
                        type="file"
                        className="text-sm text-black cursor-pointer text-center"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="w-full">
                <div className="text-center mb-6">
                  <h2 className="text-white text-4xl font-bold mb-1">Mobile Payments</h2>
                  <p className="text-white text-xl">For: Activation Fee Token (AFT) Purchases</p>
                </div>

                <div className="bg-[#2D3440] border-l border-gray-600 pl-4 overflow-x-auto">
                  {/* Table with exactly 13 rows total (1 header row + 12 data rows) */}
                  <table className="w-full text-white text-sm">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="py-2 text-left w-1/5">Date</th>
                        <th className="py-2 text-left w-1/5">Bank</th>
                        <th className="py-2 text-left w-1/4">Reference</th>
                        <th className="py-2 text-left w-1/5">Amount</th>
                        <th className="py-2 text-left w-1/5">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Limit to exactly 12 data rows for a total of 13 rows including header */}
                      {Array(12)
                        .fill(0)
                        .map((_, i) => (
                          <tr key={i} className="border-b border-gray-700">
                            <td className="py-2">Date</td>
                            <td className="py-2">Bank</td>
                            <td className="py-2">Reference</td>
                            <td className="py-2">Amount</td>
                            <td className="py-2">Status</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="border-t border-yellow-400 mt-6 pt-6 flex justify-center">
              <button
                onClick={handleSubmitMobilePayment}
                className={`font-medium rounded-md py-2 px-8 ${
                  screenshotUploaded
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-gray-500 text-gray-300 cursor-not-allowed"
                }`}
                disabled={!screenshotUploaded}
              >
                Submit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
