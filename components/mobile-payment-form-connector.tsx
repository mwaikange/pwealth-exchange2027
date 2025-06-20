"use client"

import type React from "react"

import { useEffect } from "react"
import { useMobilePaymentForm } from "@/hooks/use-mobile-payment-form"

interface MobilePaymentFormConnectorProps {
  onSubmit: (data: any) => void
  onCancel: () => void
  initialAmount?: string
}

export function MobilePaymentFormConnector({
  onSubmit,
  onCancel,
  initialAmount = "50",
}: MobilePaymentFormConnectorProps) {
  const {
    countries,
    banks,
    networks,
    config,
    selectedCountry,
    setSelectedCountry,
    selectedBank,
    setSelectedBank,
    selectedNetwork,
    setSelectedNetwork,
    amount,
    setAmount,
    name,
    setName,
    transactionDate,
    setTransactionDate,
    referenceNumber,
    setReferenceNumber,
    mobileNumber,
    setMobileNumber,
    screenshot,
    isLoading,
    isSubmitting,
    error,
    success,
    handleSubmit,
    handleFileChange,
    calculateLocalAmount,
  } = useMobilePaymentForm()

  // Set initial amount
  useEffect(() => {
    setAmount(initialAmount)
  }, [initialAmount, setAmount])

  // Handle form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Calculate local amount
    const localAmount = calculateLocalAmount(amount, selectedCountry)

    // Create submission data
    const submissionData = {
      countryId: selectedCountry,
      bankId: selectedBank,
      networkId: selectedNetwork,
      name,
      transactionDate,
      referenceNumber,
      amount, // USD amount
      localAmount, // Local currency amount
      mobileNumber,
      screenshot,
    }

    // Call parent onSubmit
    onSubmit(submissionData)
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold mb-4 text-white">Mobile Payment</h2>

      <form onSubmit={handleFormSubmit}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Country</label>
            <select
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              disabled={isLoading || isSubmitting}
            >
              <option value="">Select Country</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Bank</label>
            <select
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              disabled={!selectedCountry || isLoading || isSubmitting}
            >
              <option value="">Select Bank</option>
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">Amount (USD)</label>
          <input
            type="text"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {selectedCountry && amount && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Local Amount ({countries.find((c) => c.id === selectedCountry)?.currency_code || "NAD"})
            </label>
            <input
              type="text"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white font-medium"
              value={calculateLocalAmount(amount, selectedCountry).toFixed(2)}
              readOnly
            />
          </div>
        )}

        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
            disabled={isSubmitting || !selectedCountry || !selectedBank || !amount}
          >
            {isSubmitting ? "Processing..." : "Submit Payment"}
          </button>
        </div>
      </form>
    </div>
  )
}
