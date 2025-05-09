"use client"

import { useState } from "react"
import { useMobilePaymentForm } from "@/hooks/use-mobile-payment-form"
import { formatDate } from "@/utils/date-utils"

export function MobilePaymentModal() {
  const {
    countries,
    banks,
    networks,
    config,
    submissions,
    isAuthenticated,
    needsLogin,
    selectedCountry,
    setSelectedCountry,
    selectedBank,
    setSelectedBank,
    selectedNetwork,
    setSelectedNetwork,
    paymentNumber,
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
    handleSubmit,
    handleFileChange,
    isLoading,
    isSubmitting,
    error,
    success,
    checkAuth,
    redirectToLogin,
  } = useMobilePaymentForm()

  const [showHistory, setShowHistory] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-amber-500 text-white p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Mobile Payments</h1>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="bg-white text-amber-500 px-3 py-1 rounded-md text-sm font-medium"
        >
          {showHistory ? "Back to Form" : "View History"}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">
        {/* Authentication error with login button */}
        {needsLogin && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1 md:flex md:justify-between">
                <p className="text-sm text-red-700">You need to be logged in to submit payments.</p>
                <button
                  onClick={redirectToLogin}
                  className="ml-3 inline-flex items-center text-sm font-medium text-red-700 hover:text-red-500"
                >
                  Log In
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error message (not related to authentication) */}
        {error && !needsLogin && !success && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {showHistory ? (
          // Payment history
          <div>
            <h2 className="text-xl font-semibold mb-4">Payment History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        No payment history found
                      </td>
                    </tr>
                  ) : (
                    submissions.map((submission) => (
                      <tr key={submission.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {submission.date ? formatDate(new Date(submission.date)) : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {submission.pay_banks?.name || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {submission.reference_number || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {submission.amount ? `$${submission.amount}` : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              submission.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : submission.status === "processed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {submission.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Payment form
          <div>
            <h2 className="text-xl font-semibold mb-4">For: Activation Fee Token (AFT) Purchases</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Country and Bank selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                    Country
                  </label>
                  <select
                    id="country"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    disabled={isLoading}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
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
                  <label htmlFor="bank" className="block text-sm font-medium text-gray-700">
                    Bank
                  </label>
                  <select
                    id="bank"
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    disabled={!selectedCountry || isLoading || banks.length === 0}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
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

              {/* Amount */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                  Amount (USD) - local conversion below.
                </label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isLoading}
                  min="1"
                  step="1"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                />
              </div>

              {/* Payment number */}
              {selectedBank && paymentNumber && (
                <div className="bg-gray-100 p-4 rounded-md">
                  <h3 className="font-medium text-gray-900">Make payment to this number:</h3>
                  <p className="text-2xl font-bold mt-1">{paymentNumber}</p>
                  {networks.length > 0 && selectedNetwork && (
                    <p className="text-sm text-gray-500 mt-1">
                      Network: {networks.find((n) => n.id === selectedNetwork)?.name || "Unknown"}
                    </p>
                  )}
                </div>
              )}

              {/* Network selection if available */}
              {networks.length > 0 && (
                <div>
                  <label htmlFor="network" className="block text-sm font-medium text-gray-700">
                    Network
                  </label>
                  <select
                    id="network"
                    value={selectedNetwork}
                    onChange={(e) => setSelectedNetwork(e.target.value)}
                    disabled={isLoading}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                  >
                    <option value="">Select Network</option>
                    {networks.map((network) => (
                      <option key={network.id} value={network.id}>
                        {network.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dynamic form fields based on config */}
              {config && (
                <div className="space-y-4">
                  {/* Name */}
                  {config.requires_name && (
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Name (exactly as it appears on recipient's SMS - Full Name if Required)
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isLoading}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                      />
                    </div>
                  )}

                  {/* Transaction Date */}
                  {config.requires_date && (
                    <div>
                      <label htmlFor="transactionDate" className="block text-sm font-medium text-gray-700">
                        Date of Transaction (Must be made the day of submission)
                      </label>
                      <input
                        type="date"
                        id="transactionDate"
                        value={transactionDate}
                        onChange={(e) => setTransactionDate(e.target.value)}
                        disabled={isLoading}
                        max={new Date().toISOString().split("T")[0]}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                      />
                    </div>
                  )}

                  {/* Reference Number */}
                  {config.requires_ref_number && (
                    <div>
                      <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-700">
                        Reference Number
                      </label>
                      <input
                        type="text"
                        id="referenceNumber"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        disabled={isLoading}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                      />
                    </div>
                  )}

                  {/* Mobile Number */}
                  {config.requires_sender_mobile && (
                    <div>
                      <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700">
                        Mobile Number
                      </label>
                      <input
                        type="text"
                        id="mobileNumber"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        disabled={isLoading}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                      />
                    </div>
                  )}

                  {/* Screenshot */}
                  {config.requires_screenshot && (
                    <div>
                      <label htmlFor="screenshot" className="block text-sm font-medium text-gray-700">
                        Screenshot
                      </label>
                      <input
                        type="file"
                        id="screenshot"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isLoading}
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                      />
                      {screenshot && (
                        <p className="mt-2 text-sm text-gray-500">
                          Selected file: {screenshot.name} ({Math.round(screenshot.size / 1024)} KB)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Submit button */}
              <div>
                <button
                  type="submit"
                  disabled={needsLogin || isSubmitting || isLoading || !selectedCountry || !selectedBank || !amount}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Payment"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
